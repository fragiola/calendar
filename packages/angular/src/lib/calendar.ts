// `CALENDAR`: every directive of the main entry, for a component's `imports` (React's `Calendar`
// namespace). The features' directives are in their entries (the selection's
// `CalendarSelectionDirective`, …), imported one by one.
import { CalendarAllDayRowDirective } from "./directives/all-day-row.directive";
import { CalendarColumnDirective } from "./directives/column.directive";
import {
    CalendarColumnEventsDirective,
    CalendarColumnEventsItemDirective,
} from "./directives/column-events.directive";
import { CalendarColumnHeaderDirective } from "./directives/column-header.directive";
import {
    CalendarColumnHeadersDirective,
    CalendarColumnHeadersItemDirective,
} from "./directives/column-headers.directive";
import {
    CalendarColumnsDirective,
    CalendarColumnsItemDirective,
} from "./directives/columns.directive";
import { CalendarDayDirective } from "./directives/day.directive";
import {
    CalendarDayEventsDirective,
    CalendarDayEventsItemDirective,
} from "./directives/day-events.directive";
import { CalendarDayGridDirective } from "./directives/day-grid.directive";
import { CalendarDaysDirective } from "./directives/days.directive";
import { CalendarListDirective } from "./directives/list.directive";
import {
    CalendarListDayDirective,
    CalendarListDayItemDirective,
} from "./directives/list-day.directive";
import { CalendarListDaysDirective } from "./directives/list-days.directive";
import { CalendarListEventDirective } from "./directives/list-event.directive";
import { CalendarMoreDirective } from "./directives/more.directive";
import { CalendarNextDirective } from "./directives/next.directive";
import { CalendarPreviousDirective } from "./directives/previous.directive";
import { CalendarRootDirective } from "./directives/root.directive";
import { CalendarScrollerDirective } from "./directives/scroller.directive";
import { CalendarSegmentDirective } from "./directives/segment.directive";
import { CalendarSlotDirective } from "./directives/slot.directive";
import { CalendarSlotLabelDirective } from "./directives/slot-label.directive";
import { CalendarSlotRowDirective } from "./directives/slot-row.directive";
import { CalendarSlotRowsDirective } from "./directives/slot-rows.directive";
import { CalendarSlotsDirective } from "./directives/slots.directive";
import { CalendarTimeEventDirective } from "./directives/time-event.directive";
import { CalendarTimeGridDirective } from "./directives/time-grid.directive";
import { CalendarTodayDirective } from "./directives/today.directive";
import { CalendarViewButtonDirective } from "./directives/view-button.directive";
import { CalendarWeekDirective } from "./directives/week.directive";
import { CalendarWeekNumberDirective } from "./directives/week-number.directive";
import { CalendarWeeksDirective } from "./directives/weeks.directive";

/** Every directive of the calendar's main entry: `imports: [CALENDAR]`. */
export const CALENDAR = [
    CalendarAllDayRowDirective,
    CalendarColumnEventsDirective,
    CalendarColumnEventsItemDirective,
    CalendarColumnHeaderDirective,
    CalendarColumnHeadersDirective,
    CalendarColumnHeadersItemDirective,
    CalendarColumnDirective,
    CalendarColumnsDirective,
    CalendarColumnsItemDirective,
    CalendarDayEventsDirective,
    CalendarDayEventsItemDirective,
    CalendarDayGridDirective,
    CalendarDayDirective,
    CalendarDaysDirective,
    CalendarListDayDirective,
    CalendarListDayItemDirective,
    CalendarListDaysDirective,
    CalendarListEventDirective,
    CalendarListDirective,
    CalendarMoreDirective,
    CalendarNextDirective,
    CalendarPreviousDirective,
    CalendarRootDirective,
    CalendarScrollerDirective,
    CalendarSegmentDirective,
    CalendarSlotLabelDirective,
    CalendarSlotRowDirective,
    CalendarSlotRowsDirective,
    CalendarSlotDirective,
    CalendarSlotsDirective,
    CalendarTimeEventDirective,
    CalendarTimeGridDirective,
    CalendarTodayDirective,
    CalendarViewButtonDirective,
    CalendarWeekNumberDirective,
    CalendarWeekDirective,
    CalendarWeeksDirective,
] as const;
