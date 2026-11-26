import { computed, Directive, type DoCheck, type Signal } from "@angular/core";
import {
    bindPart,
    injectCalendarContext,
    injectHost,
    type SlotViews,
    sameValue,
} from "@fragiola/calendar-angular/internal";
import { injectDayGrid } from "../inject/inject-day-grid";
import { injectTimeGrid } from "../inject/inject-time-grid";
import { bindCollection, injectParent } from "../utils/collection";

export interface ColumnHeadersState {
    /** the dates of the columns: a time grid's days, a month's first row (its weekdays) */
    dates: readonly string[];
}

/**
 * The grid's header row (`role="row"`): `<div calendarColumnHeaders>` with an
 * `<ng-template calendarColumnHeadersItem let-date>` per column, a header per day (time grid) or
 * weekday (month). A time grid's axis is its column 1 (`aria-colindex`), so no corner cell is
 * needed.
 */
@Directive({
    selector: "[calendarColumnHeaders]",
    exportAs: "calendarColumnHeaders",
})
export class CalendarColumnHeadersDirective {
    private readonly context = injectCalendarContext("[calendarColumnHeaders]");
    private readonly timeGrid = injectTimeGrid();
    private readonly dayGrid = injectDayGrid();

    /** @internal the dates of the columns */
    readonly dates: Signal<readonly string[]> = computed(
        () => {
            const columns = this.timeGrid();
            return columns
                ? columns.columns.map((column) => column.date)
                : (this.dayGrid()?.weeks[0]?.days ?? []).map((day) => day.date);
        },
        { equal: (a, b) => a.join() === b.join() },
    );

    /** what it shows */
    readonly state: Signal<ColumnHeadersState> = computed(
        () => ({ dates: this.dates() }),
        { equal: sameValue },
    );

    constructor() {
        bindPart(this.context, injectHost(), "column-headers", () => ({}));
    }
}

/** The context of the `calendarColumnHeadersItem` template: the column's date (`let-date`). */
export interface ColumnHeadersItemContext {
    $implicit: string;
    date: string;
}

/**
 * Renders one column's header of a `[calendarColumnHeaders]` (React's children function):
 * `<ng-template calendarColumnHeadersItem let-date>`, usually a `[calendarColumnHeader]`.
 */
@Directive({ selector: "ng-template[calendarColumnHeadersItem]" })
export class CalendarColumnHeadersItemDirective implements DoCheck {
    static ngTemplateContextGuard(
        _directive: CalendarColumnHeadersItemDirective,
        _context: unknown,
    ): _context is ColumnHeadersItemContext {
        return true;
    }

    private readonly headers = injectParent(
        CalendarColumnHeadersDirective,
        "calendarColumnHeadersItem",
        "[calendarColumnHeaders]",
    );
    private readonly views: SlotViews<ColumnHeadersItemContext> =
        bindCollection(() =>
            this.headers.dates().map((date) => ({
                key: date,
                context: { $implicit: date, date },
            })),
        );

    /** its views are checked whenever the template it is in is (as embedded views are) */
    ngDoCheck(): void {
        this.views.markForCheck();
    }
}
