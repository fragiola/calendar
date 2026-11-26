import { Directive, type DoCheck, type Signal, signal } from "@angular/core";
import type { TimeGridColumn } from "@fragiola/calendar";
import {
    bindPart,
    bindStructuralStyle,
    injectCalendarContext,
    injectHost,
    type SlotViews,
} from "@fragiola/calendar-angular/internal";
import { injectTimeGrid } from "../inject/inject-time-grid";
import { bindCollection, injectParent } from "../utils/collection";

export type ColumnsState = Record<never, never>;

/**
 * The layer of the time grid's columns (`role="row"`, the grid's last row: a `gridcell` per day
 * holding its timed events), laid over its slot rows (position it yourself: it sets no geometry
 * of its own): `<div calendarColumns>` with an `<ng-template calendarColumnsItem let-column>`.
 * Presses go through it to the slots; its events take their own.
 */
@Directive({ selector: "[calendarColumns]", exportAs: "calendarColumns" })
export class CalendarColumnsDirective {
    private readonly context = injectCalendarContext("[calendarColumns]");

    /** @internal the time grid's columns */
    readonly grid = injectTimeGrid();

    /** what it shows: nothing of its own */
    readonly state: Signal<ColumnsState> = signal({}).asReadonly();

    constructor() {
        const host = injectHost();
        bindPart(this.context, host, "columns", () => ({}));
        bindStructuralStyle(host, () => ({ pointerEvents: "none" }));
    }
}

/** The context of the `calendarColumnsItem` template: the column (`let-column`). */
export interface ColumnsItemContext {
    $implicit: TimeGridColumn;
    column: TimeGridColumn;
}

/**
 * Renders one day of a `[calendarColumns]` (React's children function):
 * `<ng-template calendarColumnsItem let-column>`, usually a `[calendarColumn]`. A column's view
 * renders again only when its column changes.
 */
@Directive({ selector: "ng-template[calendarColumnsItem]" })
export class CalendarColumnsItemDirective implements DoCheck {
    static ngTemplateContextGuard(
        _directive: CalendarColumnsItemDirective,
        _context: unknown,
    ): _context is ColumnsItemContext {
        return true;
    }

    private readonly columns = injectParent(
        CalendarColumnsDirective,
        "calendarColumnsItem",
        "[calendarColumns]",
    );
    private readonly views: SlotViews<ColumnsItemContext> = bindCollection(() =>
        (this.columns.grid()?.columns ?? []).map((column) => ({
            key: column.date,
            context: { $implicit: column, column },
        })),
    );

    /** its views are checked whenever the template it is in is (as embedded views are) */
    ngDoCheck(): void {
        this.views.markForCheck();
    }
}
