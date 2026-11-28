import { Directive, type DoCheck } from "@angular/core";
import type { TimeGridColumn } from "@fragiola/calendar";
import type { SlotViews } from "@fragiola/calendar-angular/internal";
import { injectTimeGrid } from "../inject/inject-time-grid";
import { bindCollection } from "../utils/collection";

/** The context of the `calendarSlots` template: the column (`let-column`). */
export interface SlotsContext {
    $implicit: TimeGridColumn;
    column: TimeGridColumn;
}

/**
 * The days of the enclosing `[calendarSlotRow]` (React's `Calendar.Slots`):
 * `<ng-template calendarSlots let-column>` renders its template per column, after the
 * `[calendarSlotLabel]` (no element of its own), usually a `[calendarSlot]="column.date"`.
 */
@Directive({ selector: "ng-template[calendarSlots]" })
export class CalendarSlotsDirective implements DoCheck {
    static ngTemplateContextGuard(
        _directive: CalendarSlotsDirective,
        _context: unknown,
    ): _context is SlotsContext {
        return true;
    }

    private readonly grid = injectTimeGrid();
    private readonly views: SlotViews<SlotsContext> = bindCollection(() =>
        // keyed by position: the next range's slots reuse these views (Epic #27)
        (this.grid()?.columns ?? []).map((column, index) => ({
            key: String(index),
            context: { $implicit: column, column },
        })),
    );

    /** its views are checked whenever the template it is in is (as embedded views are) */
    ngDoCheck(): void {
        this.views.markForCheck();
    }
}
