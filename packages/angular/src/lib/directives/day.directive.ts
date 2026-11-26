import { computed, Directive, inject, input, type Signal } from "@angular/core";
import type { DayCell, Segment } from "@fragiola/calendar";
import {
    beforeInputs,
    bindPart,
    CALENDAR_DAY,
    CALENDAR_WEEK,
    type DayContext,
    flag,
    injectCalendarContext,
    injectHost,
    injectRequired,
    sameValue,
} from "@fragiola/calendar-angular/internal";

/** What a day shows (`[calendarDay]`, `injectDay`). */
export interface DayState {
    /** the day as the layout gives it (`date`, `today`, `outside`, `hiddenCount`, …) */
    day: DayCell;
    /** it holds the roving focus */
    focused: boolean;
    /** a selected range covers it (`selection()`) */
    selected: boolean;
    /** outside `validRange` */
    disabled: boolean;
    /** it has business hours (`constraints()`) */
    businessHours: boolean;
}

/**
 * A day of a month or of the all-day row (`role="gridcell"`, `data-date`, `data-today`, …):
 * `<div [calendarDay]="day">`, one cell of the grid's roving focus. Enter moves focus into its
 * events. `#cell="calendarDay"` gives its `state()` and the `segments()` that start in it.
 */
@Directive({
    selector: "[calendarDay]",
    exportAs: "calendarDay",
    providers: [
        {
            provide: CALENDAR_DAY,
            useFactory: () => inject(CalendarDayDirective).dayContext,
        },
    ],
})
export class CalendarDayDirective {
    /** the day, from `<ng-template calendarDays let-day>` */
    readonly calendarDay = input.required<DayCell>();

    private readonly context = injectCalendarContext("[calendarDay]");
    private readonly row = injectRequired(
        CALENDAR_WEEK,
        "[calendarDay]",
        "[calendarWeek] or [calendarAllDayRow]",
    );
    private readonly day = computed(() =>
        beforeInputs(undefined, this.calendarDay),
    );
    private readonly column = computed(() => {
        const date = this.day()?.date;
        return (
            this.row.week()?.days.findIndex((one) => one.date === date) ?? -1
        );
    });

    /** @internal what the parts inside read */
    readonly dayContext: DayContext = {
        day: this.day,
        column: this.column,
        week: this.row.week,
    };

    /** the segments of its row that start in it, in lane order */
    readonly segments: Signal<readonly Segment[]> = computed(
        () => {
            const column = this.column();
            return (this.row.week()?.segments ?? []).filter(
                (segment) => segment.startColumn === column,
            );
        },
        { equal: sameValue },
    );

    private readonly attributes = bindPart(
        this.context,
        injectHost(),
        "day",
        () => {
            const day = this.day();
            return day ? { date: day.date } : undefined;
        },
    );

    /** what it shows (`undefined` until its day is set) */
    readonly state: Signal<DayState | undefined> = computed(() => {
        const day = this.day();
        const attributes = this.attributes();
        return day
            ? {
                  day,
                  focused: flag(attributes, "focused"),
                  selected: flag(attributes, "selected"),
                  disabled: flag(attributes, "disabled"),
                  businessHours: flag(attributes, "business-hours"),
              }
            : undefined;
    });
}
