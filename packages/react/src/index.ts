// The whole core, so that a React app installs and imports one package. A local export would
// silently shadow a core name of the same spelling: tests/index.test.ts fails on one.
export * from "@fragiola/calendar";
export type {
    AllDayRowProps,
    AllDayRowState,
} from "./components/all-day-row";
export type { ColumnProps, ColumnState } from "./components/column";
export type {
    ColumnEventsProps,
    ColumnEventsState,
} from "./components/column-events";
export type {
    ColumnHeaderProps,
    ColumnHeaderState,
} from "./components/column-header";
export type {
    ColumnHeadersProps,
    ColumnHeadersState,
} from "./components/column-headers";
export type { ColumnsProps, ColumnsState } from "./components/columns";
export type { DayProps } from "./components/day";
export type {
    DayEventsProps,
    DayEventsState,
} from "./components/day-events";
export type { DayGridProps, DayGridState } from "./components/day-grid";
export type { DaysProps } from "./components/days";
export type { ListProps, ListState } from "./components/list";
export type { ListDayProps, ListDayState } from "./components/list-day";
export type { ListDaysProps } from "./components/list-days";
export type { ListEventProps } from "./components/list-event";
export type { MoreProps, MoreState } from "./components/more";
export type { NextProps, NextState } from "./components/next";
export type { PreviousProps, PreviousState } from "./components/previous";
export type {
    RootBaseProps,
    RootEngineProps,
    RootEventProps,
    RootProps,
    RootState,
    RootView,
} from "./components/root";
export type { ScrollerProps, ScrollerState } from "./components/scroller";
export type { SegmentProps } from "./components/segment";
export type { SlotProps } from "./components/slot";
export type { SlotLabelProps, SlotLabelState } from "./components/slot-label";
export type { SlotRowProps, SlotRowState } from "./components/slot-row";
export type { SlotRowsProps } from "./components/slot-rows";
export type { SlotsProps } from "./components/slots";
export type { TimeEventProps } from "./components/time-event";
export type { TimeGridProps, TimeGridState } from "./components/time-grid";
export type { TodayProps, TodayState } from "./components/today";
export type {
    ViewButtonProps,
    ViewButtonState,
} from "./components/view-button";
export type { WeekProps, WeekState } from "./components/week";
export type {
    WeekNumberProps,
    WeekNumberState,
} from "./components/week-number";
export type { WeeksProps } from "./components/weeks";
export {
    type CalendarHandle,
    type CalendarRef,
    createCalendarRef,
} from "./hooks/create-calendar-ref";
export type {
    CommandButtonState,
    EventState,
    PartHookResult,
} from "./hooks/internal";
export { type UseCalendarResult, useCalendar } from "./hooks/use-calendar";
export { useCalendarRef } from "./hooks/use-calendar-ref";
export { useCalendarTitle } from "./hooks/use-calendar-title";
export { type CalendarView, useCalendarView } from "./hooks/use-calendar-view";
export { type DayState, useDay } from "./hooks/use-day";
export { useDayGrid } from "./hooks/use-day-grid";
export { useDayHeader } from "./hooks/use-day-header";
export { type ListEventState, useListEvent } from "./hooks/use-list-event";
export { useListLayout } from "./hooks/use-list-layout";
export { type SegmentState, useSegment } from "./hooks/use-segment";
export { type SlotState, useSlot } from "./hooks/use-slot";
export { useSlotLabel } from "./hooks/use-slot-label";
export { type TimeEventState, useTimeEvent } from "./hooks/use-time-event";
export { useTimeGrid } from "./hooks/use-time-grid";
export * as Calendar from "./parts";
export type {
    ButtonPrimitiveProps,
    DivPrimitiveProps,
    PrimitiveProps,
    RenderedProps,
    RenderProp,
    SpanPrimitiveProps,
} from "./utils/use-render";
