import type { Signal } from "@angular/core";
import type { DayGrid } from "@fragiola/calendar";
import {
    calendarValue,
    injectCalendarContext,
} from "@fragiola/calendar-angular/internal";

/**
 * The day grid the calendar shows (a month, or a time grid's all-day row), with the lane limit the
 * engine measured for `dayMaxEvents: "auto"`; `null` in a list view. Rows keep their identity while
 * they do not change.
 */
export function injectDayGrid(): Signal<DayGrid | null> {
    const context = injectCalendarContext("injectDayGrid");
    return calendarValue(
        context,
        () => {
            const engine = context.engine();
            return engine
                ? engine.get("day-grid")
                : context.model().get("day-grid");
        },
        { part: "day-grid" },
    );
}
