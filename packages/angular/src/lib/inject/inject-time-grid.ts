import type { Signal } from "@angular/core";
import type { TimeGrid } from "@fragiola/calendar";
import {
    calendarValue,
    injectCalendarContext,
} from "@fragiola/calendar-angular/internal";

/** The time grid the calendar shows (week, day and `days` views; `null` otherwise). */
export function injectTimeGrid(): Signal<TimeGrid | null> {
    const context = injectCalendarContext("injectTimeGrid");
    return calendarValue(context, () => context.model().get("time-grid"), {
        part: "time-grid",
    });
}
