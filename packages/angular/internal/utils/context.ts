// The injection tokens of the calendar's directives (React's contexts). The root's holds the model
// and the engine with the registry erased (`AnyTypes`) and every feature's keys: a child cannot
// infer the root's `T` and `F` through injection, so the typed surface is each directive's inputs
// and the injection functions' type arguments (`injectCalendar<Types, typeof features>()`). Each
// part reads what it shows through the root's `version`, or its part's revision (`calendarValue`),
// so a change renders again only the parts whose value changed.
import { InjectionToken, inject, type Signal } from "@angular/core";
import type {
    AnyTypes,
    CalendarEngine,
    CalendarFeature,
    CalendarFeatures,
    CalendarModel,
    CalendarTypes,
    DayCell,
    DayGridWeek,
    ListDay,
    PartAttributeOptions,
    PartName,
    TimeGridColumn,
    TimeSegment,
    TimeSlot,
} from "@fragiola/calendar";

/** Every feature, as the directives see a model: each feature's keys are typed (`undefined` without it). */
export type EveryFeature = readonly [
    CalendarFeature<"selection">,
    CalendarFeature<"drag-and-drop">,
    CalendarFeature<"resize">,
    CalendarFeature<"recurrence">,
    CalendarFeature<"now-indicator">,
    CalendarFeature<"constraints">,
    CalendarFeature<"external-drop">,
    CalendarFeature<"event-sources">,
];

/** The model as the directives see it: any registry, every feature's keys. */
export type AnyCalendarModel = CalendarModel<AnyTypes, EveryFeature>;

/** The engine as the directives see it: any registry, every feature's keys. */
export type AnyCalendarEngine = CalendarEngine<AnyTypes, EveryFeature>;

/** The context of a `[calendarRoot]`. */
export interface CalendarContext {
    /** the root's model (its `calendarRoot` input, or the one it created) */
    readonly model: Signal<AnyCalendarModel>;
    /** the engine, once the root is rendered in a browser (null before, and on the server) */
    readonly engine: Signal<AnyCalendarEngine | null>;
    /** the engine as apps see it: always there, forwarding to the engine once it exists */
    readonly publicEngine: CalendarEngine;
    /** bumped on every commit of the model and every view change of the engine */
    readonly version: Signal<number>;
    /**
     * a part's revision: bumped on every commit of the model and on the view changes that may
     * change what the part shows (the engine's `affects`, Issue #25)
     */
    revision(part: PartName): Signal<number>;
    /**
     * the calendar's views were touched (a change, an element registered or gone, a collection's
     * template checked): the root tells the engine after the next render (`committed()`)
     */
    touched(): void;
    /** the names of the model's features */
    readonly installed: Signal<ReadonlySet<string>>;
    /** how the app renders the parts (the root's `weekNumberColumn`), for every part's attributes */
    readonly partOptions: Signal<PartAttributeOptions>;
    /** warns once per message and root */
    warn(message: string): void;
}

export const CALENDAR_CONTEXT = new InjectionToken<CalendarContext>("Calendar");

/** The day-grid row a subtree renders (`[calendarWeek]`, `[calendarAllDayRow]`). */
export interface WeekContext {
    /** `undefined` until the directive's input is set (or a time grid with no all-day row) */
    readonly week: Signal<DayGridWeek | undefined>;
}

export const CALENDAR_WEEK = new InjectionToken<WeekContext>("CalendarWeek");

/** The day a subtree renders (`[calendarDay]`). */
export interface DayContext {
    /** `undefined` until the directive's input is set */
    readonly day: Signal<DayCell | undefined>;
    /** its column in the row (-1 while unknown) */
    readonly column: Signal<number>;
    readonly week: Signal<DayGridWeek | undefined>;
}

export const CALENDAR_DAY = new InjectionToken<DayContext>("CalendarDay");

/** The slot row a subtree renders (`[calendarSlotRow]`). */
export interface SlotRowContext {
    /** `undefined` until the directive's input is set */
    readonly slot: Signal<TimeSlot | undefined>;
}

export const CALENDAR_SLOT_ROW = new InjectionToken<SlotRowContext>(
    "CalendarSlotRow",
);

/** The time-grid column a subtree renders (`[calendarColumn]`). */
export interface ColumnContext {
    /** `undefined` until the directive's input is set */
    readonly column: Signal<TimeGridColumn | undefined>;
}

export const CALENDAR_COLUMN = new InjectionToken<ColumnContext>(
    "CalendarColumn",
);

/** The list day a subtree renders (`[calendarListDay]`). */
export interface ListDayContext {
    /** `undefined` until the directive's input is set */
    readonly day: Signal<ListDay | undefined>;
}

export const CALENDAR_LIST_DAY = new InjectionToken<ListDayContext>(
    "CalendarListDay",
);

/** The occurrence element a subtree renders (a segment, a timed event, a list event). */
export interface EventContext {
    /** `undefined` until the directive's input is set */
    readonly occurrenceId: Signal<string | undefined>;
    /** the day of the cell it starts in */
    readonly date: Signal<string | undefined>;
    /** a timed event's segment, for what is positioned with it */
    readonly timeSegment: Signal<TimeSegment | undefined>;
}

export const CALENDAR_EVENT = new InjectionToken<EventContext>("CalendarEvent");

/** The root's context, or the error naming where a part belongs. */
export function injectCalendarContext(part: string): CalendarContext {
    const context = inject(CALENDAR_CONTEXT, { optional: true });
    if (!context) {
        throw new Error(`${part} must be used inside [calendarRoot]`);
    }
    return context;
}

/** The value of a token a part needs, or the error naming where it belongs. */
export function injectRequired<V>(
    token: InjectionToken<V>,
    part: string,
    inside: string,
): V {
    const value = inject(token, { optional: true });
    if (!value) throw new Error(`${part} must be used inside ${inside}`);
    return value;
}

/** A model of any registry and features, seen as the directives see it. */
export function eraseModel<T extends CalendarTypes, F extends CalendarFeatures>(
    model: CalendarModel<T, F>,
): AnyCalendarModel {
    return model as unknown as AnyCalendarModel;
}

/** The erased model seen with the registry and features the caller declares. */
export function typedModel<
    T extends CalendarTypes,
    F extends CalendarFeatures = readonly [],
>(model: AnyCalendarModel): CalendarModel<T, F> {
    return model as unknown as CalendarModel<T, F>;
}

/** The erased engine seen with the registry and features the caller declares. */
export function typedEngine<
    T extends CalendarTypes,
    F extends CalendarFeatures = readonly [],
>(engine: CalendarEngine): CalendarEngine<T, F> {
    return engine as unknown as CalendarEngine<T, F>;
}
