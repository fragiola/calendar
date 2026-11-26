import { Directive, type Signal, signal } from "@angular/core";
import {
    bindPart,
    injectCalendarContext,
    injectHost,
} from "@fragiola/calendar-angular/internal";

export type TimeGridState = Record<never, never>;

/**
 * A week's, a day's or a `days` view's grid (`role="grid"`), in rows: the `[calendarColumnHeaders]`,
 * the `[calendarAllDayRow]`, then the `<ng-template calendarSlotRows>` (usually in a
 * `[calendarScroller]`) with the `[calendarColumns]` layer over them. One tab stop: the keys move
 * the roving focus over its all-day days and slots.
 */
@Directive({ selector: "[calendarTimeGrid]", exportAs: "calendarTimeGrid" })
export class CalendarTimeGridDirective {
    private readonly context = injectCalendarContext("[calendarTimeGrid]");

    /** what it shows: nothing of its own */
    readonly state: Signal<TimeGridState> = signal({}).asReadonly();

    constructor() {
        bindPart(this.context, injectHost(), "time-grid", () => ({}));
    }
}
