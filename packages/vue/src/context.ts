// The injections of the Calendar primitives. The root's holds the model and the engine with the
// registry erased (`AnyTypes`) and every feature's keys: a child cannot infer the root's `T` and
// `F` through injection, so the typed surface is `typedCalendar<T, F>()` and the composables' type
// arguments (`useCalendar<Types, typeof features>()`). The root's context never changes while its
// model stays (another model remounts the root): each part reads what it shows through a computed
// on the root's `version` (`useCalendarValue`), so a change re-renders only the parts whose value
// changed. The model's state is frozen data, never made reactive: only `version` and `engine` are
// refs.
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
    TimeGridColumn,
    TimeSegment,
    TimeSlot,
} from "@fragiola/calendar";
import {
    type ComputedRef,
    type InjectionKey,
    inject,
    type Ref,
    type ShallowRef,
} from "vue";

/** Every feature, as the primitives see a model: each feature's keys are typed (`undefined` without it). */
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

/** The model as the primitives see it: any registry, every feature's keys. */
export type AnyCalendarModel = CalendarModel<AnyTypes, EveryFeature>;

/** The engine as the primitives see it: any registry, every feature's keys. */
export type AnyCalendarEngine = CalendarEngine<AnyTypes, EveryFeature>;

/** The context of a `Calendar.Root`. */
export interface CalendarContextValue {
    readonly model: AnyCalendarModel;
    /** the engine, once the root is mounted (null before, and on the server) */
    readonly engine: Readonly<ShallowRef<AnyCalendarEngine | null>>;
    /** the engine as apps see it: always there, forwarding to the engine once it exists */
    readonly publicEngine: CalendarEngine;
    /** bumped on every commit of the model and every view change of the engine */
    readonly version: Readonly<Ref<number>>;
    /** the names of the model's features */
    readonly installed: ReadonlySet<string>;
    /** warns once per message and root */
    readonly warn: (message: string) => void;
}

export const CalendarKey: InjectionKey<CalendarContextValue> =
    Symbol("Calendar");

/** The day-grid row a subtree renders (`Calendar.Week`, `Calendar.AllDayRow`). */
export interface WeekContextValue {
    readonly week: DayGridWeek;
}

export const WeekKey: InjectionKey<ComputedRef<WeekContextValue>> =
    Symbol("CalendarWeek");

/** The day a subtree renders (`Calendar.Day`). */
export interface DayContextValue {
    readonly day: DayCell;
    /** its column in the row */
    readonly column: number;
    readonly week: DayGridWeek;
}

export const DayKey: InjectionKey<ComputedRef<DayContextValue>> =
    Symbol("CalendarDay");

/** The slot row a subtree renders (`Calendar.SlotRow`). */
export interface SlotRowContextValue {
    readonly slot: TimeSlot;
}

export const SlotRowKey: InjectionKey<ComputedRef<SlotRowContextValue>> =
    Symbol("CalendarSlotRow");

/** The time-grid column a subtree renders (`Calendar.Column`). */
export interface ColumnContextValue {
    readonly column: TimeGridColumn;
}

export const ColumnKey: InjectionKey<ComputedRef<ColumnContextValue>> =
    Symbol("CalendarColumn");

/** The list day a subtree renders (`Calendar.ListDay`). */
export interface ListDayContextValue {
    readonly day: ListDay;
}

export const ListDayKey: InjectionKey<ComputedRef<ListDayContextValue>> =
    Symbol("CalendarListDay");

/** The occurrence element a subtree renders (a segment, a timed event, a list event). */
export interface EventContextValue {
    readonly occurrenceId: string;
    /** the day of the cell it starts in */
    readonly date: string;
    /** a timed event's segment, for what is positioned with it */
    readonly timeSegment?: TimeSegment | undefined;
}

export const EventKey: InjectionKey<ComputedRef<EventContextValue>> =
    Symbol("CalendarEvent");

export function useCalendarContext(part: string): CalendarContextValue {
    const context = inject(CalendarKey, null);
    if (!context) {
        throw new Error(
            `Calendar.${part} must be rendered inside Calendar.Root`,
        );
    }
    return context;
}

/** The value of an injection a part needs, or the error naming where it belongs. */
export function useRequired<V>(
    key: InjectionKey<ComputedRef<V>>,
    part: string,
    inside: string,
): ComputedRef<V> {
    const value = inject(key, null);
    if (!value) {
        throw new Error(`Calendar.${part} must be rendered inside ${inside}`);
    }
    return value;
}

/** The value of an injection a part may be rendered without (`undefined` outside it). */
export function useOptional<V>(
    key: InjectionKey<ComputedRef<V>>,
): ComputedRef<V> | null {
    return inject(key, null);
}

/** A model of any registry and features, seen as the primitives see it. */
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
