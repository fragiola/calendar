import { computed, Directive, input, type Signal } from "@angular/core";
import {
    beforeInputs,
    bindPart,
    flag,
    injectCalendarContext,
    injectHost,
} from "@fragiola/calendar-angular/internal";

export interface ColumnHeaderState {
    /** its day, `YYYY-MM-DD` (a month's header stands for its weekday) */
    date: string;
    today: boolean;
    weekend: boolean;
    past: boolean;
}

/**
 * A column's header (`role="columnheader"`, `data-date`, `data-today`, …):
 * `<div [calendarColumnHeader]="date">`; what it shows is yours (`injectDayHeader(date)` gives the
 * parts).
 */
@Directive({
    selector: "[calendarColumnHeader]",
    exportAs: "calendarColumnHeader",
})
export class CalendarColumnHeaderDirective {
    /** the day, from `<ng-template calendarColumnHeadersItem let-date>` */
    readonly calendarColumnHeader = input.required<string>();

    private readonly context = injectCalendarContext("[calendarColumnHeader]");
    private readonly date = computed(() =>
        beforeInputs(undefined, this.calendarColumnHeader),
    );
    private readonly attributes = bindPart(
        this.context,
        injectHost(),
        "column-header",
        () => {
            const date = this.date();
            return date === undefined ? undefined : { date };
        },
    );

    /** what it shows (`undefined` until its date is set) */
    readonly state: Signal<ColumnHeaderState | undefined> = computed(() => {
        const date = this.date();
        const attributes = this.attributes();
        return date === undefined
            ? undefined
            : {
                  date,
                  today: flag(attributes, "today"),
                  weekend: flag(attributes, "weekend"),
                  past: flag(attributes, "past"),
              };
    });
}
