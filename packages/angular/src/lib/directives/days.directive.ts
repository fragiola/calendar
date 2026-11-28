import { Directive, type DoCheck } from "@angular/core";
import type { DayCell, DayGridWeek } from "@fragiola/calendar";
import {
    CALENDAR_WEEK,
    injectRequired,
    type SlotViews,
} from "@fragiola/calendar-angular/internal";
import { bindCollection } from "../utils/collection";

/** The context of the `calendarDays` template: the day (`let-day`) and its row (`let-week="week"`). */
export interface DaysContext {
    $implicit: DayCell;
    day: DayCell;
    week: DayGridWeek;
}

/**
 * The days of the enclosing `[calendarWeek]` or `[calendarAllDayRow]` (React's `Calendar.Days`):
 * `<ng-template calendarDays let-day>` renders its template per day (no element of its own),
 * usually a `[calendarDay]`. A day's view renders again only when its day or its row changes.
 */
@Directive({ selector: "ng-template[calendarDays]" })
export class CalendarDaysDirective implements DoCheck {
    static ngTemplateContextGuard(
        _directive: CalendarDaysDirective,
        _context: unknown,
    ): _context is DaysContext {
        return true;
    }

    private readonly row = injectRequired(
        CALENDAR_WEEK,
        "calendarDays",
        "[calendarWeek] or [calendarAllDayRow]",
    );
    private readonly views: SlotViews<DaysContext> = bindCollection(() => {
        const week = this.row.week();
        // keyed by position: the next range's days reuse these views (Epic #27)
        return (week?.days ?? []).map((day, index) => ({
            key: String(index),
            context: { $implicit: day, day, week: week as DayGridWeek },
        }));
    });

    /** its views are checked whenever the template it is in is (as embedded views are) */
    ngDoCheck(): void {
        this.views.markForCheck();
    }
}
