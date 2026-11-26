// The hooks and helpers only the primitives call.
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
import * as React from "react";
import {
    type CalendarContextValue,
    ColumnContext,
    WeekContext,
} from "../context";

/** @internal `useLayoutEffect` in a browser, nothing on the server (where it would warn) */
export const useIsomorphicLayoutEffect =
    typeof document === "undefined" ? () => {} : React.useLayoutEffect;

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
 * @internal a value read from the root's model and engine: read again on each change of either
 * (and on each render, as `read` may close over props), the last object kept while equal, so the
 * part re-renders only when what it shows changed
 */
export function useCalendarValue<S>(
    context: CalendarContextValue,
    read: () => S,
    isEqual: (a: S, b: S) => boolean = sameValue,
): S {
    const { store } = context;
    const cache = React.useRef<
        { version: number; read: () => S; value: S } | undefined
    >(undefined);
    const latest = React.useRef({ read, isEqual });
    latest.current = { read, isEqual };
    const getSnapshot = (): S => {
        const version = store.version();
        const previous = cache.current;
        if (
            previous?.version === version &&
            previous.read === latest.current.read
        ) {
            return previous.value;
        }
        const value = latest.current.read();
        const kept =
            previous !== undefined &&
            latest.current.isEqual(previous.value, value)
                ? previous.value
                : value;
        cache.current = { version, read: latest.current.read, value: kept };
        return kept;
    };
    return React.useSyncExternalStore(
        store.subscribe,
        getSnapshot,
        getSnapshot,
    );
}

/** @internal a part's attributes as React props: `tabindex` is `tabIndex`, absent ones left out */
export function reactAttributes(
    attributes: PartAttributes,
): Record<string, string | number> {
    const props: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(attributes)) {
        if (value === undefined) continue;
        if (key === "tabindex") props.tabIndex = Number(value);
        else props[key] = value;
    }
    return props;
}

/** @internal whether a boolean `data-*` attribute is present */
export function flag(attributes: PartAttributes, name: string): boolean {
    return attributes[`data-${name}`] !== undefined;
}

/** @internal what a part renders and registers: its attributes, and the ref that registers it */
export interface PartWiring {
    readonly attributes: PartAttributes;
    /** the attributes as React props */
    readonly props: Record<string, string | number>;
    /** registers the element with the engine (once it exists), unregisters it on unmount */
    readonly ref: React.RefCallback<HTMLElement>;
}

/**
 * @internal a part's wiring: the attributes the engine gives it (before the engine: the model's,
 * `partAttributes`, so the server render and the first client render are the same) and its
 * registration with the engine (the engine measures, hit-tests and focuses what is registered)
 */
export function usePart<P extends PartName>(
    context: CalendarContextValue,
    part: P,
    payload: PartPayloadMap[P],
    /** registers the element (a decoration shown in several places at once is not) */
    register = true,
): PartWiring {
    const { model, engine } = context;
    const key = JSON.stringify(payload);
    const attributes = useCalendarValue(context, () =>
        engine
            ? engine.adapter.attributes(part, payload)
            : partAttributes(model, part, payload),
    );
    // biome-ignore lint/correctness/useExhaustiveDependencies: the payload is its key
    const ref = React.useCallback<React.RefCallback<HTMLElement>>(
        (element) => {
            if (!engine || !element || !register) return;
            engine.adapter.register(part, payload, element);
            return () => engine.adapter.register(part, payload, null);
        },
        [engine, part, key, register],
    );
    const props = React.useMemo(
        () => reactAttributes(attributes),
        [attributes],
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

/** What a part hook returns: its state, and the props for its element (spread them on it). */
export interface PartHookResult<S> {
    state: S;
    props: Record<string, unknown> & { ref: React.RefCallback<HTMLElement> };
}

/** @internal a part hook's props split into the element's props and its ref, for `useRenderElement` */
export function splitRef(props: PartHookResult<unknown>["props"]): {
    ref: React.RefCallback<HTMLElement>;
    style: React.CSSProperties | undefined;
    props: Record<string, unknown>;
} {
    const { ref, style, ...rest } = props;
    return {
        ref,
        style: style as React.CSSProperties | undefined,
        props: rest,
    };
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
    payload: PartPayloadMap[P],
    run: () => void,
): { state: CommandButtonState; wiring: PartWiring; onClick: () => void } {
    const wiring = usePart(context, part, payload);
    const disabled = flag(wiring.attributes, "disabled");
    return {
        state: { disabled },
        wiring,
        onClick: () => {
            if (!disabled) run();
        },
    };
}

/** @internal the segments a preview shows where a part is: its column's, else its row's */
export function useWhere(): {
    column: TimeGridColumn | undefined;
    week: DayGridWeek | undefined;
} {
    const column = React.useContext(ColumnContext)?.column;
    const week = React.useContext(WeekContext)?.week;
    return { column, week: column ? undefined : week };
}

/** @internal a preview's segments in a column (time grid) or a row (day grid) */
export function previewSegmentsIn(
    preview: PreviewSegments | null | undefined,
    where: {
        column: TimeGridColumn | undefined;
        week: DayGridWeek | undefined;
    },
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
