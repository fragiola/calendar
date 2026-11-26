// The `Calendar` namespace typed by the app's registry and features, for templates (Tree's
// `typedTree`, fragiola/tree packages/vue/src/typed.ts, same author and licence).
import type { CalendarFeatures, CalendarTypes } from "@fragiola/calendar";
import type { AllDayRowProps, AllDayRowSlots } from "./components/all-day-row";
import type { ColumnProps, ColumnSlots } from "./components/column";
import type {
    ColumnEventsProps,
    ColumnEventsSlots,
} from "./components/column-events";
import type {
    ColumnHeaderProps,
    ColumnHeaderSlots,
} from "./components/column-header";
import type {
    ColumnHeadersProps,
    ColumnHeadersSlots,
} from "./components/column-headers";
import type { ColumnsProps, ColumnsSlots } from "./components/columns";
import type { DayProps, DaySlots } from "./components/day";
import type { DayEventsProps, DayEventsSlots } from "./components/day-events";
import type { DayGridProps, DayGridSlots } from "./components/day-grid";
import type { DaysProps, DaysSlots } from "./components/days";
import type { ListProps, ListSlots } from "./components/list";
import type { ListDayProps, ListDaySlots } from "./components/list-day";
import type { ListDaysProps, ListDaysSlots } from "./components/list-days";
import type { ListEventProps, ListEventSlots } from "./components/list-event";
import type { MoreProps, MoreSlots } from "./components/more";
import type { NextProps, NextSlots } from "./components/next";
import type { PreviousProps, PreviousSlots } from "./components/previous";
import type { RootEmits, RootProps, RootSlots } from "./components/root";
import type { ScrollerProps, ScrollerSlots } from "./components/scroller";
import type { SegmentProps, SegmentSlots } from "./components/segment";
import type { SlotProps, SlotSlots } from "./components/slot";
import type { SlotLabelProps, SlotLabelSlots } from "./components/slot-label";
import type { SlotRowProps, SlotRowSlots } from "./components/slot-row";
import type { SlotRowsProps, SlotRowsSlots } from "./components/slot-rows";
import type { SlotsProps, SlotsSlots } from "./components/slots";
import type { TimeEventProps, TimeEventSlots } from "./components/time-event";
import type { TimeGridProps, TimeGridSlots } from "./components/time-grid";
import type { TodayProps, TodaySlots } from "./components/today";
import type {
    ViewButtonProps,
    ViewButtonSlots,
} from "./components/view-button";
import type { WeekProps, WeekSlots } from "./components/week";
import type {
    WeekNumberProps,
    WeekNumberSlots,
} from "./components/week-number";
import type { WeeksProps, WeeksSlots } from "./components/weeks";
import * as parts from "./parts";
import type { CalendarComponent } from "./utils/primitive";

/**
 * The `Calendar` primitives typed by the registry `T` (the root's `model`, `events` and its
 * `update:events`) and the features `F` (the root's engine events: `@select` with `selection()`,
 * `@event-drop` with `dragAndDrop()` or `resize()`, `@external-drop` with `externalDrop()`).
 */
export interface TypedCalendar<
    T extends CalendarTypes,
    F extends CalendarFeatures = readonly [],
> {
    AllDayRow: CalendarComponent<AllDayRowProps, AllDayRowSlots>;
    Column: CalendarComponent<ColumnProps, ColumnSlots>;
    ColumnEvents: CalendarComponent<ColumnEventsProps, ColumnEventsSlots>;
    ColumnHeader: CalendarComponent<ColumnHeaderProps, ColumnHeaderSlots>;
    ColumnHeaders: CalendarComponent<ColumnHeadersProps, ColumnHeadersSlots>;
    Columns: CalendarComponent<ColumnsProps, ColumnsSlots>;
    Day: CalendarComponent<DayProps, DaySlots>;
    DayEvents: CalendarComponent<DayEventsProps, DayEventsSlots>;
    DayGrid: CalendarComponent<DayGridProps, DayGridSlots>;
    Days: CalendarComponent<DaysProps, DaysSlots>;
    List: CalendarComponent<ListProps, ListSlots>;
    ListDay: CalendarComponent<ListDayProps, ListDaySlots>;
    ListDays: CalendarComponent<ListDaysProps, ListDaysSlots>;
    ListEvent: CalendarComponent<ListEventProps, ListEventSlots>;
    More: CalendarComponent<MoreProps, MoreSlots>;
    Next: CalendarComponent<NextProps, NextSlots>;
    Previous: CalendarComponent<PreviousProps, PreviousSlots>;
    Root: CalendarComponent<RootProps<T, F>, RootSlots, RootEmits<T, F>>;
    Scroller: CalendarComponent<ScrollerProps, ScrollerSlots>;
    Segment: CalendarComponent<SegmentProps, SegmentSlots>;
    Slot: CalendarComponent<SlotProps, SlotSlots>;
    SlotLabel: CalendarComponent<SlotLabelProps, SlotLabelSlots>;
    SlotRow: CalendarComponent<SlotRowProps, SlotRowSlots>;
    SlotRows: CalendarComponent<SlotRowsProps, SlotRowsSlots>;
    Slots: CalendarComponent<SlotsProps, SlotsSlots>;
    TimeEvent: CalendarComponent<TimeEventProps, TimeEventSlots>;
    TimeGrid: CalendarComponent<TimeGridProps, TimeGridSlots>;
    Today: CalendarComponent<TodayProps, TodaySlots>;
    ViewButton: CalendarComponent<ViewButtonProps, ViewButtonSlots>;
    Week: CalendarComponent<WeekProps, WeekSlots>;
    WeekNumber: CalendarComponent<WeekNumberProps, WeekNumberSlots>;
    Weeks: CalendarComponent<WeeksProps, WeeksSlots>;
}

/**
 * The `Calendar` primitives typed by your registry and your features: what React writes as type
 * arguments (`<Calendar.Root<Types, typeof features>>`), which a Vue template cannot pass. The
 * same components, typed:
 *
 * ```ts
 * const Calendar = typedCalendar<Types, typeof features>();
 * // <Calendar.Root :model="model" @select="onSelect">: `@select` compiles with selection()
 * ```
 */
export function typedCalendar<
    T extends CalendarTypes,
    F extends CalendarFeatures = readonly [],
>(): TypedCalendar<T, F> {
    return parts as unknown as TypedCalendar<T, F>;
}
