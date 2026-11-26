// The composables and helpers only the primitives call.
import {
    type DayGridWeek,
    type FeatureName,
    type PartAttributes,
    type PartName,
    type PartPayloadMap,
    type PreviewSegments,
    partAttributes,
    type Segment,
    type TimeGridColumn,
    type TimeSegment,
} from "@fragiola/calendar";
import { type ComputedRef, type CSSProperties, computed, nextTick } from "vue";
import {
    type CalendarContextValue,
    ColumnKey,
    useOptional,
    WeekKey,
} from "../context";
import { type ElementRef, elementRef } from "../utils/render";

/** @internal two values are the same: `Object.is`, or records whose entries are */
export function sameValue(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (
        typeof a !== "object" ||
        typeof b !== "object" ||
        a === null ||
        b === null ||
        Array.isArray(a) !== Array.isArray(b)
    ) {
        return false;
    }
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    return keys.every((key) =>
        Object.is(
            (a as Record<string, unknown>)[key],
            (b as Record<string, unknown>)[key],
        ),
    );
}

/**
 * @internal a value read from the root's model and engine, as a computed: read again on each
 * change of either (the root's `version`, the engine appearing) and of any reactive value `read`
 * uses (a prop), the last object kept while equal, so a render that reads it re-runs only when
 * what it shows changed (packages/react's `useCalendarValue`)
 */
export function useCalendarValue<S>(
    context: CalendarContextValue,
    read: () => S,
    isEqual: (a: S, b: S) => boolean = sameValue,
): ComputedRef<S> {
    let has = false;
    return computed((previous?: S) => {
        context.version.value;
        context.engine.value;
        const value = read();
        if (has && isEqual(previous as S, value)) return previous as S;
        has = true;
        return value;
    });
}

/** @internal whether a boolean `data-*` attribute is present */
export function flag(attributes: PartAttributes, name: string): boolean {
    return attributes[`data-${name}`] !== undefined;
}

/** @internal what a part renders and registers: its attributes, and the ref that registers it */
export interface PartWiring {
    /** the attributes the engine (or, before it, the model) gives the part */
    readonly attributes: ComputedRef<PartAttributes>;
    /**
     * the attributes as the element's props: a new object when the attributes change or the
     * engine appears, so the part renders again then and its template ref registers it
     */
    readonly props: ComputedRef<Record<string, string | undefined>>;
    /** registers the element with the engine (once it exists), unregisters it when it goes away */
    readonly ref: ElementRef;
}

/**
 * @internal a part's wiring: the attributes the engine gives it (before the engine: the model's,
 * `partAttributes`, so the server render and the first client render are the same) and its
 * registration with the engine (the engine measures, hit-tests and focuses what is registered)
 */
export function usePart<P extends PartName>(
    context: CalendarContextValue,
    part: P,
    payload: () => PartPayloadMap[P],
    /** registers the element (a decoration shown in several places at once is not) */
    register = true,
): PartWiring {
    const { model } = context;
    const attributes = useCalendarValue(context, () => {
        const engine = context.engine.value;
        return engine
            ? engine.adapter.attributes(part, payload())
            : partAttributes(model, part, payload());
    });
    const props = computed(() => {
        context.engine.value;
        return { ...attributes.value };
    });
    const ref = elementRef(
        (element) => {
            const engine = context.engine.value;
            if (!engine || !register) return undefined;
            const registered = payload();
            // Vue calls a function ref while it mounts a subtree, before the subtree is in the
            // document: the engine measures and focuses what it registers, so a detached element
            // registers once the flush has inserted it (and before the root's `committed()`)
            let done = false;
            let gone = false;
            const attach = () => {
                if (gone) return;
                done = true;
                engine.adapter.register(part, registered, element);
            };
            if (element.isConnected) attach();
            else void nextTick().then(attach);
            return () => {
                gone = true;
                if (done) engine.adapter.register(part, registered, null);
            };
        },
        () => [context.engine.value, JSON.stringify(payload())],
    );
    return { attributes, props, ref };
}

/**
 * @internal whether the root's model has a feature; a part of a feature it lacks warns once (the
 * part then renders nothing)
 */
export function useFeature(
    context: CalendarContextValue,
    feature: FeatureName,
    part: string,
): boolean {
    const installed = context.installed.has(feature);
    if (!installed) {
        context.warn(
            `Calendar.${part} needs the ${feature} feature (\`${feature}()\` in the model's features): it renders nothing`,
        );
    }
    return installed;
}

/** The state every occurrence's element shows (a segment, a timed event, a list event). */
export interface EventState {
    eventId: string;
    occurrenceId: string;
    /** its calendar (category) */
    calendarId: string | undefined;
    allDay: boolean;
    /** this element's part started before its row, column or day */
    continuesBefore: boolean;
    /** this element's part ends after its row, column or day */
    continuesAfter: boolean;
    /** it holds the roving focus */
    focused: boolean;
    /** a pointer drags it (`dragAndDrop()`) */
    dragging: boolean;
    /** the keyboard grabbed it (`dragAndDrop()`) */
    grabbed: boolean;
    /** it is being resized (`resize()`) */
    resizing: boolean;
}

/** @internal an occurrence's element state, from its attributes */
export function eventStateOf(attributes: PartAttributes): EventState {
    return {
        eventId: attributes["data-event-id"] ?? "",
        occurrenceId: attributes["data-occurrence-id"] ?? "",
        calendarId: attributes["data-calendar-id"],
        allDay: flag(attributes, "all-day"),
        continuesBefore: flag(attributes, "continues-before"),
        continuesAfter: flag(attributes, "continues-after"),
        focused: flag(attributes, "focused"),
        dragging: flag(attributes, "dragging"),
        grabbed: flag(attributes, "grabbed"),
        resizing: flag(attributes, "resizing"),
    };
}

/** The props a part composable gives its element: bind them on it (`v-bind="props"`). */
export type PartElementProps = Record<string, unknown> & {
    /** the function template ref that registers the element with the engine */
    ref: ElementRef;
    /** its structural style, where it has one */
    style?: CSSProperties | undefined;
};

/** What a part composable returns: its state, and the props for its element (`v-bind` them). */
export interface PartComposableResult<S> {
    state: ComputedRef<S>;
    props: ComputedRef<PartElementProps>;
}

/** @internal a part composable's props split into the element's props, its ref and its style */
export function splitRef(props: PartElementProps): {
    ref: ElementRef;
    style: CSSProperties | undefined;
    props: Record<string, unknown>;
} {
    const { ref, style, ...rest } = props;
    return { ref, style, props: rest };
}

/** What a navigation button shows (`Calendar.Previous`, `Next`, `Today`, `ViewButton`). */
export interface CommandButtonState {
    /** its command cannot run now (`model.can` says no: outside `validRange`) */
    disabled: boolean;
}

/** @internal a button that runs a view command, disabled when the model cannot run it */
export function useCommandButton<
    P extends "previous" | "next" | "today" | "view-button",
>(
    context: CalendarContextValue,
    part: P,
    payload: () => PartPayloadMap[P],
    run: () => void,
): {
    state: ComputedRef<CommandButtonState>;
    wiring: PartWiring;
    onClick: () => void;
} {
    const wiring = usePart(context, part, payload);
    const state = computed(() => ({
        disabled: flag(wiring.attributes.value, "disabled"),
    }));
    return {
        state,
        wiring,
        onClick: () => {
            if (!state.value.disabled) run();
        },
    };
}

/** Where a decoration is: its column (time grid), else its row (day grid). */
export interface Where {
    column: TimeGridColumn | undefined;
    week: DayGridWeek | undefined;
}

/** @internal the segments a preview shows where a part is: its column's, else its row's */
export function useWhere(): ComputedRef<Where> {
    const column = useOptional(ColumnKey);
    const week = useOptional(WeekKey);
    return computed(() => {
        const inColumn = column?.value.column;
        return {
            column: inColumn,
            week: inColumn ? undefined : week?.value.week,
        };
    });
}

/** The row's space before its first day (a week number, a label): the app's `--calendar-row-inset`. */
const ROW_INSET = "var(--calendar-row-inset, 0px)";

/**
 * @internal the structural style of a decoration over a day-grid row (a selection, a drag
 * preview), the row its containing block: over its `span` days from `startColumn`, the full height
 * of the row, after the row's `--calendar-row-inset`, on logical properties
 */
export function rowSegmentStyle(segment: Segment, days: number): CSSProperties {
    const width = `(100% - ${ROW_INSET})`;
    return {
        position: "absolute",
        insetBlock: 0,
        insetInlineStart: `calc(${ROW_INSET} + ${width} * ${segment.startColumn / days})`,
        inlineSize: `calc(${width} * ${segment.span / days})`,
    };
}

/**
 * The structural style of a time-grid segment (D18): its layout fractions as percentages of its
 * column, on logical properties (right to left needs nothing more).
 */
export function timeSegmentStyle(segment: TimeSegment): CSSProperties {
    return {
        position: "absolute",
        top: `${segment.top * 100}%`,
        height: `${segment.height * 100}%`,
        insetInlineStart: `${(segment.column / segment.columns) * 100}%`,
        width: `${(segment.span / segment.columns) * 100}%`,
    };
}

/** @internal the structural style of a preview's segment where it is (a column, a row) */
export function previewStyle(
    segment: TimeSegment | Segment,
    where: Where,
): CSSProperties | undefined {
    if (where.column) return timeSegmentStyle(segment as TimeSegment);
    if (where.week) {
        return rowSegmentStyle(segment as Segment, where.week.days.length);
    }
    return undefined;
}

/** @internal a preview's segments in a column (time grid) or a row (day grid) */
export function previewSegmentsIn(
    preview: PreviewSegments | null | undefined,
    where: Where,
): readonly (TimeSegment | Segment)[] {
    if (!preview) return [];
    if (where.column) {
        const date = where.column.date;
        return preview.columns.find((one) => one.date === date)?.segments ?? [];
    }
    if (where.week) {
        const id = where.week.id;
        return preview.weeks.find((one) => one.weekId === id)?.segments ?? [];
    }
    return [];
}
