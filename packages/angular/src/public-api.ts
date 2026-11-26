// The whole core, so that an Angular app installs and imports one package. A local export would
// silently shadow a core name of the same spelling: tests/index.test.ts fails on one. The
// features' directives and injection functions are in their entries
// (`@fragiola/calendar-angular/selection`, …), which a calendar that never imports them does not
// ship.
export * from "@fragiola/calendar";
export type {
    CommandButtonState,
    EventState,
} from "@fragiola/calendar-angular/internal";
export { CALENDAR } from "./lib/calendar";
export {
    type AllDayRowState,
    CalendarAllDayRowDirective,
} from "./lib/directives/all-day-row.directive";
export {
    CalendarColumnDirective,
    type ColumnState,
} from "./lib/directives/column.directive";
export {
    CalendarColumnEventsDirective,
    CalendarColumnEventsItemDirective,
    type ColumnEventsItemContext,
    type ColumnEventsState,
} from "./lib/directives/column-events.directive";
export {
    CalendarColumnHeaderDirective,
    type ColumnHeaderState,
} from "./lib/directives/column-header.directive";
export {
    CalendarColumnHeadersDirective,
    CalendarColumnHeadersItemDirective,
    type ColumnHeadersItemContext,
    type ColumnHeadersState,
} from "./lib/directives/column-headers.directive";
export {
    CalendarColumnsDirective,
    CalendarColumnsItemDirective,
    type ColumnsItemContext,
    type ColumnsState,
} from "./lib/directives/columns.directive";
export {
    CalendarDayDirective,
    type DayState,
} from "./lib/directives/day.directive";
export {
    CalendarDayEventsDirective,
    CalendarDayEventsItemDirective,
    type DayEventsItemContext,
    type DayEventsState,
} from "./lib/directives/day-events.directive";
export {
    CalendarDayGridDirective,
    type DayGridState,
} from "./lib/directives/day-grid.directive";
export {
    CalendarDaysDirective,
    type DaysContext,
} from "./lib/directives/days.directive";
export {
    CalendarListDirective,
    type ListState,
} from "./lib/directives/list.directive";
export {
    CalendarListDayDirective,
    CalendarListDayItemDirective,
    type ListDayItemContext,
    type ListDayState,
} from "./lib/directives/list-day.directive";
export {
    CalendarListDaysDirective,
    type ListDaysContext,
} from "./lib/directives/list-days.directive";
export {
    CalendarListEventDirective,
    type ListEventState,
} from "./lib/directives/list-event.directive";
export {
    CalendarMoreDirective,
    type MoreContext,
    type MoreState,
} from "./lib/directives/more.directive";
export {
    CalendarNextDirective,
    type NextState,
} from "./lib/directives/next.directive";
export {
    CalendarPreviousDirective,
    type PreviousState,
} from "./lib/directives/previous.directive";
export {
    CalendarRootDirective,
    type RootState,
    type RootView,
} from "./lib/directives/root.directive";
export {
    CalendarScrollerDirective,
    type ScrollerState,
} from "./lib/directives/scroller.directive";
export {
    CalendarSegmentDirective,
    type SegmentState,
} from "./lib/directives/segment.directive";
export {
    CalendarSlotDirective,
    type SlotState,
} from "./lib/directives/slot.directive";
export {
    CalendarSlotLabelDirective,
    type SlotLabelState,
} from "./lib/directives/slot-label.directive";
export {
    CalendarSlotRowDirective,
    type SlotRowState,
} from "./lib/directives/slot-row.directive";
export {
    CalendarSlotRowsDirective,
    type SlotRowsContext,
} from "./lib/directives/slot-rows.directive";
export {
    CalendarSlotsDirective,
    type SlotsContext,
} from "./lib/directives/slots.directive";
export {
    CalendarTimeEventDirective,
    type TimeEventState,
} from "./lib/directives/time-event.directive";
export {
    CalendarTimeGridDirective,
    type TimeGridState,
} from "./lib/directives/time-grid.directive";
export {
    CalendarTodayDirective,
    type TodayState,
} from "./lib/directives/today.directive";
export {
    CalendarViewButtonDirective,
    type ViewButtonState,
} from "./lib/directives/view-button.directive";
export {
    CalendarWeekDirective,
    type WeekState,
} from "./lib/directives/week.directive";
export {
    CalendarWeekNumberDirective,
    type WeekNumberState,
} from "./lib/directives/week-number.directive";
export {
    CalendarWeeksDirective,
    type WeeksContext,
} from "./lib/directives/weeks.directive";
export {
    type CalendarHandle,
    type CalendarRef,
    createCalendarRef,
} from "./lib/inject/create-calendar-ref";
export {
    type InjectCalendarResult,
    injectCalendar,
} from "./lib/inject/inject-calendar";
export { injectCalendarRef } from "./lib/inject/inject-calendar-ref";
export { injectCalendarTitle } from "./lib/inject/inject-calendar-title";
export {
    type CalendarView,
    injectCalendarView,
} from "./lib/inject/inject-calendar-view";
export { type InjectDayResult, injectDay } from "./lib/inject/inject-day";
export { injectDayGrid } from "./lib/inject/inject-day-grid";
export { injectDayHeader } from "./lib/inject/inject-day-header";
export {
    type InjectListEventResult,
    injectListEvent,
} from "./lib/inject/inject-list-event";
export { injectListLayout } from "./lib/inject/inject-list-layout";
export {
    type InjectSegmentResult,
    injectSegment,
} from "./lib/inject/inject-segment";
export { type InjectSlotResult, injectSlot } from "./lib/inject/inject-slot";
export { injectSlotLabel } from "./lib/inject/inject-slot-label";
export {
    type InjectTimeEventResult,
    injectTimeEvent,
} from "./lib/inject/inject-time-event";
export { injectTimeGrid } from "./lib/inject/inject-time-grid";
