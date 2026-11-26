import { Directive, type DoCheck } from "@angular/core";
import type { DayGridWeek } from "@fragiola/calendar";
import type { SlotViews } from "@fragiola/calendar-angular/internal";
import { injectDayGrid } from "../inject/inject-day-grid";
import { bindCollection } from "../utils/collection";

/** The context of the `calendarWeeks` template: the row (`let-week`). */
export interface WeeksContext {
    $implicit: DayGridWeek;
    week: DayGridWeek;
}

/**
 * The month's rows (React's `Calendar.Weeks`): `<ng-template calendarWeeks let-week>` inside the
 * `[calendarDayGrid]` renders its template per week, in order (no element of its own), usually a
 * `[calendarWeek]`. A row's view renders again only when its row changes.
 */
@Directive({ selector: "ng-template[calendarWeeks]" })
export class CalendarWeeksDirective implements DoCheck {
    static ngTemplateContextGuard(
        _directive: CalendarWeeksDirective,
        _context: unknown,
    ): _context is WeeksContext {
        return true;
    }

    private readonly grid = injectDayGrid();
    private readonly views: SlotViews<WeeksContext> = bindCollection(() =>
        (this.grid()?.weeks ?? []).map((week) => ({
            key: week.id,
            context: { $implicit: week, week },
        })),
    );

    /** its views are checked whenever the template it is in is (as embedded views are) */
    ngDoCheck(): void {
        this.views.markForCheck();
    }
}
