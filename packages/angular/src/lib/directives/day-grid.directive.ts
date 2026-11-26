import { Directive, type Signal, signal } from "@angular/core";
import {
    bindPart,
    injectCalendarContext,
    injectHost,
} from "@fragiola/calendar-angular/internal";

export type DayGridState = Record<never, never>;

/**
 * A month's grid (`role="grid"`): put the `[calendarColumnHeaders]` row and the
 * `<ng-template calendarWeeks>` in it. One tab stop: the keys move the roving focus over its days.
 */
@Directive({ selector: "[calendarDayGrid]", exportAs: "calendarDayGrid" })
export class CalendarDayGridDirective {
    private readonly context = injectCalendarContext("[calendarDayGrid]");

    /** what it shows: nothing of its own */
    readonly state: Signal<DayGridState> = signal({}).asReadonly();

    constructor() {
        bindPart(this.context, injectHost(), "day-grid", () => ({}));
    }
}
