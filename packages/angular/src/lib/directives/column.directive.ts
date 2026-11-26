import { computed, Directive, inject, input, type Signal } from "@angular/core";
import type { TimeGridColumn } from "@fragiola/calendar";
import {
    beforeInputs,
    bindPart,
    bindStructuralStyle,
    CALENDAR_COLUMN,
    type ColumnContext,
    flag,
    injectCalendarContext,
    injectHost,
} from "@fragiola/calendar-angular/internal";

export interface ColumnState {
    /** the column as the time grid gives it (`date`, `today`, `segments`, …) */
    column: TimeGridColumn;
    /** a selected range covers the day (`selection()`) */
    selected: boolean;
}

/**
 * A day's positioned layer over the slot rows (`role="gridcell"` of the columns' row, `data-date`,
 * `data-today`, …; outside the roving focus: the slots are): `<div [calendarColumn]="column">`
 * with its `[calendarColumnEvents]` and the features' decorations. The engine hit-tests on it:
 * give it the day's full height. It is the containing block of its events (`position: relative`).
 */
@Directive({
    selector: "[calendarColumn]",
    exportAs: "calendarColumn",
    providers: [
        {
            provide: CALENDAR_COLUMN,
            useFactory: () => inject(CalendarColumnDirective).columnContext,
        },
    ],
})
export class CalendarColumnDirective {
    /** the column, from `<ng-template calendarColumnsItem let-column>` */
    readonly calendarColumn = input.required<TimeGridColumn>();

    private readonly context = injectCalendarContext("[calendarColumn]");
    private readonly column = computed(() =>
        beforeInputs(undefined, this.calendarColumn),
    );

    /** @internal what the parts inside read */
    readonly columnContext: ColumnContext = { column: this.column };

    private readonly host = injectHost();
    private readonly attributes = bindPart(
        this.context,
        this.host,
        "column",
        () => {
            const column = this.column();
            return column ? { date: column.date } : undefined;
        },
    );

    /** what it shows (`undefined` until its column is set) */
    readonly state: Signal<ColumnState | undefined> = computed(() => {
        const column = this.column();
        return column
            ? { column, selected: flag(this.attributes(), "selected") }
            : undefined;
    });

    constructor() {
        bindStructuralStyle(this.host, () => ({ position: "relative" }));
    }
}
