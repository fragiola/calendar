import { Directive, type DoCheck } from "@angular/core";
import type { ListDay } from "@fragiola/calendar";
import type { SlotViews } from "@fragiola/calendar-angular/internal";
import { injectListLayout } from "../inject/inject-list-layout";
import { bindCollection } from "../utils/collection";

/** The context of the `calendarListDays` template: the day (`let-day`). */
export interface ListDaysContext {
    $implicit: ListDay;
    day: ListDay;
}

/**
 * A list view's days with events, in order (React's `Calendar.ListDays`):
 * `<ng-template calendarListDays let-day>` renders its template per day (no element of its own):
 * a heading of yours, then a `[calendarListDay]`.
 */
@Directive({ selector: "ng-template[calendarListDays]" })
export class CalendarListDaysDirective implements DoCheck {
    static ngTemplateContextGuard(
        _directive: CalendarListDaysDirective,
        _context: unknown,
    ): _context is ListDaysContext {
        return true;
    }

    private readonly layout = injectListLayout();
    private readonly views: SlotViews<ListDaysContext> = bindCollection(() =>
        this.layout().days.map((day) => ({
            key: day.date,
            context: { $implicit: day, day },
        })),
    );

    /** its views are checked whenever the template it is in is (as embedded views are) */
    ngDoCheck(): void {
        this.views.markForCheck();
    }
}
