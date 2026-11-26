// The whole core, so that a Vue app installs and imports one package. A local export would
// silently shadow a core name of the same spelling: tests/index.test.ts fails on one.
export * from "@fragiola/calendar";
export type {
    AllDayRowProps,
    AllDayRowSlots,
    AllDayRowState,
} from "./components/all-day-row";
export type {
    ColumnProps,
    ColumnSlots,
    ColumnState,
} from "./components/column";
export type {
    ColumnEventsProps,
    ColumnEventsSlots,
    ColumnEventsState,
} from "./components/column-events";
export type {
    ColumnHeaderProps,
    ColumnHeaderSlots,
    ColumnHeaderState,
} from "./components/column-header";
export type {
    ColumnHeadersProps,
    ColumnHeadersSlots,
    ColumnHeadersState,
} from "./components/column-headers";
export type {
    ColumnsProps,
    ColumnsSlots,
    ColumnsState,
} from "./components/columns";
export type {
    DayProps,
    DaySlotScope,
    DaySlots,
} from "./components/day";
export type {
    DayEventsProps,
    DayEventsSlots,
    DayEventsState,
} from "./components/day-events";
export type {
    DayGridProps,
    DayGridSlots,
    DayGridState,
} from "./components/day-grid";
export type {
    DaysProps,
    DaysSlots,
} from "./components/days";
export type {
    ListProps,
    ListSlots,
    ListState,
} from "./components/list";
export type {
    ListDayProps,
    ListDaySlots,
    ListDayState,
} from "./components/list-day";
export type {
    ListDaysProps,
    ListDaysSlots,
} from "./components/list-days";
export type {
    ListEventProps,
    ListEventSlots,
} from "./components/list-event";
export type {
    MoreProps,
    MoreSlots,
    MoreState,
} from "./components/more";
export type {
    NextProps,
    NextSlots,
    NextState,
} from "./components/next";
export type {
    PreviousProps,
    PreviousSlots,
    PreviousState,
} from "./components/previous";
export type {
    RootBaseProps,
    RootEmits,
    RootEngineEmits,
    RootEngineProps,
    RootMissingEvents,
    RootProps,
    RootSlots,
    RootState,
    RootView,
} from "./components/root";
export type {
    ScrollerProps,
    ScrollerSlots,
    ScrollerState,
} from "./components/scroller";
export type {
    SegmentProps,
    SegmentSlots,
} from "./components/segment";
export type {
    SlotProps,
    SlotSlots,
} from "./components/slot";
export type {
    SlotLabelProps,
    SlotLabelSlots,
    SlotLabelState,
} from "./components/slot-label";
export type {
    SlotRowProps,
    SlotRowSlots,
    SlotRowState,
} from "./components/slot-row";
export type {
    SlotRowsProps,
    SlotRowsSlots,
} from "./components/slot-rows";
export type {
    SlotsProps,
    SlotsSlots,
} from "./components/slots";
export type {
    TimeEventProps,
    TimeEventSlots,
} from "./components/time-event";
export type {
    TimeGridProps,
    TimeGridSlots,
    TimeGridState,
} from "./components/time-grid";
export type {
    TodayProps,
    TodaySlots,
    TodayState,
} from "./components/today";
export type {
    ViewButtonProps,
    ViewButtonSlots,
    ViewButtonState,
} from "./components/view-button";
export type {
    WeekProps,
    WeekSlots,
    WeekState,
} from "./components/week";
export type {
    WeekNumberProps,
    WeekNumberSlots,
    WeekNumberState,
} from "./components/week-number";
export type {
    WeeksProps,
    WeeksSlots,
} from "./components/weeks";
export {
    type CalendarHandle,
    type CalendarRef,
    createCalendarRef,
} from "./composables/create-calendar-ref";
export type {
    CommandButtonState,
    EventState,
    PartComposableResult,
    PartElementProps,
} from "./composables/internal";
export {
    type UseCalendarResult,
    useCalendar,
} from "./composables/use-calendar";
export { useCalendarRef } from "./composables/use-calendar-ref";
export { useCalendarTitle } from "./composables/use-calendar-title";
export {
    type CalendarView,
    useCalendarView,
} from "./composables/use-calendar-view";
export { type DayState, useDay } from "./composables/use-day";
export { useDayGrid } from "./composables/use-day-grid";
export { useDayHeader } from "./composables/use-day-header";
export {
    type ListEventState,
    useListEvent,
} from "./composables/use-list-event";
export { useListLayout } from "./composables/use-list-layout";
export { type SegmentState, useSegment } from "./composables/use-segment";
export { type SlotState, useSlot } from "./composables/use-slot";
export { useSlotLabel } from "./composables/use-slot-label";
export {
    type TimeEventState,
    useTimeEvent,
} from "./composables/use-time-event";
export { useTimeGrid } from "./composables/use-time-grid";
export * as Calendar from "./parts";
export { type TypedCalendar, typedCalendar } from "./typed";
export type {
    CalendarComponent,
    PrimitiveProps,
    SlotFunction,
} from "./utils/primitive";
export type {
    AsProp,
    ElementRef,
    RenderSlot,
    RenderSlotProps,
} from "./utils/render";
