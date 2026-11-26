// The contexts of the Calendar primitives. The root's holds the model and the engine with the
// registry erased (`AnyTypes`) and every feature's keys: a child cannot infer the root's `T` and
// `F` through context, so the typed surface is each part's props and the hooks' type arguments
// (`useCalendar<Types, typeof features>()`). The root's context never changes while its model and
// engine stay: each part reads what it shows through the store (`useCalendarValue`), so a change
// re-renders only the parts whose value changed.
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
    TimeGridColumn,
    TimeSegment,
    TimeSlot,
} from "@fragiola/calendar";
import * as React from "react";
import type { CalendarStore } from "./utils/calendar-store";

/** Every feature, as the primitives see a model: each feature's keys are typed (`undefined` without it). */
type EveryFeature = readonly [
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
    /** the engine, once the root is mounted (null on the first render and on the server) */
    readonly engine: AnyCalendarEngine | null;
    /** the engine as apps see it: always there, forwarding to the engine once it exists */
    readonly publicEngine: CalendarEngine;
    /** the model's and the engine's changes, for the parts' reads */
    readonly store: CalendarStore;
    /** the names of the model's features */
    readonly installed: ReadonlySet<string>;
    /** warns once per message and root */
    readonly warn: (message: string) => void;
    /** how the app renders the parts (the root's `weekNumberColumn`), for every part's attributes */
    readonly partOptions: PartAttributeOptions;
}

export const CalendarContext = React.createContext<CalendarContextValue | null>(
    null,
);

/** The day-grid row a subtree renders (`Calendar.Week`, `Calendar.AllDayRow`). */
export interface WeekContextValue {
    readonly week: DayGridWeek;
}

export const WeekContext = React.createContext<WeekContextValue | null>(null);

/** The day a subtree renders (`Calendar.Day`). */
export interface DayContextValue {
    readonly day: DayCell;
    /** its column in the row */
    readonly column: number;
    readonly week: DayGridWeek;
}

export const DayContext = React.createContext<DayContextValue | null>(null);

/** The slot row a subtree renders (`Calendar.SlotRow`). */
export interface SlotRowContextValue {
    readonly slot: TimeSlot;
}

export const SlotRowContext = React.createContext<SlotRowContextValue | null>(
    null,
);

/** The time-grid column a subtree renders (`Calendar.Column`). */
export interface ColumnContextValue {
    readonly column: TimeGridColumn;
}

export const ColumnContext = React.createContext<ColumnContextValue | null>(
    null,
);

/** The list day a subtree renders (`Calendar.ListDay`). */
export interface ListDayContextValue {
    readonly day: ListDay;
}

export const ListDayContext = React.createContext<ListDayContextValue | null>(
    null,
);

/** The occurrence element a subtree renders (a segment, a timed event, a list event). */
export interface EventContextValue {
    readonly occurrenceId: string;
    /** the day of the cell it starts in */
    readonly date: string;
    /** a timed event's segment, for what is positioned with it */
    readonly timeSegment?: TimeSegment | undefined;
}

export const EventContext = React.createContext<EventContextValue | null>(null);

export function useCalendarContext(part: string): CalendarContextValue {
    const context = React.useContext(CalendarContext);
    if (!context) {
        throw new Error(
            `Calendar.${part} must be rendered inside Calendar.Root`,
        );
    }
    return context;
}

/** The value of a context a part needs, or the error naming where it belongs. */
export function useRequired<V>(
    context: React.Context<V | null>,
    part: string,
    inside: string,
): V {
    const value = React.useContext(context);
    if (!value) {
        throw new Error(`Calendar.${part} must be rendered inside ${inside}`);
    }
    return value;
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
