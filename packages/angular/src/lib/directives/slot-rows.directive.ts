import { Directive, type DoCheck } from "@angular/core";
import type { TimeSlot } from "@fragiola/calendar";
import type { SlotViews } from "@fragiola/calendar-angular/internal";
import { injectTimeGrid } from "../inject/inject-time-grid";
import { bindCollection } from "../utils/collection";

/** The context of the `calendarSlotRows` template: the slot (`let-slot`). */
export interface SlotRowsContext {
    $implicit: TimeSlot;
    slot: TimeSlot;
}

/**
 * The time grid's rows of slots (React's `Calendar.SlotRows`): `<ng-template calendarSlotRows
 * let-slot>` renders its template per slot, in order (no element of its own), usually a
 * `[calendarSlotRow]`.
 */
@Directive({ selector: "ng-template[calendarSlotRows]" })
export class CalendarSlotRowsDirective implements DoCheck {
    static ngTemplateContextGuard(
        _directive: CalendarSlotRowsDirective,
        _context: unknown,
    ): _context is SlotRowsContext {
        return true;
    }

    private readonly grid = injectTimeGrid();
    private readonly views: SlotViews<SlotRowsContext> = bindCollection(() =>
        (this.grid()?.slots ?? []).map((slot) => ({
            key: slot.time,
            context: { $implicit: slot, slot },
        })),
    );

    /** its views are checked whenever the template it is in is (as embedded views are) */
    ngDoCheck(): void {
        this.views.markForCheck();
    }
}
