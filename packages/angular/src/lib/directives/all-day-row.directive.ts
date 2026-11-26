import { computed, Directive, inject, type Signal } from "@angular/core";
import type { DayGridWeek } from "@fragiola/calendar";
import {
    bindPart,
    bindStructuralStyle,
    CALENDAR_WEEK,
    injectCalendarContext,
    injectHost,
    type WeekContext,
} from "@fragiola/calendar-angular/internal";
import { injectDayGrid } from "../inject/inject-day-grid";

export interface AllDayRowState {
    /** the all-day row as the day grid gives it */
    week: DayGridWeek;
}

/**
 * The time grid's all-day row (`role="row"`), its first row after the headers: the all-day and
 * multi-day events as day-grid segments, in its `<ng-template calendarDays let-day>`'s
 * `[calendarDay]`s. Up from the first slot reaches it. It is the containing block of its
 * decorations.
 */
@Directive({
    selector: "[calendarAllDayRow]",
    exportAs: "calendarAllDayRow",
    providers: [
        {
            provide: CALENDAR_WEEK,
            useFactory: () => inject(CalendarAllDayRowDirective).weekContext,
        },
    ],
})
export class CalendarAllDayRowDirective {
    private readonly context = injectCalendarContext("[calendarAllDayRow]");
    private readonly grid = injectDayGrid();
    private readonly week = computed(() => this.grid()?.weeks[0]);

    /** @internal what the parts inside read */
    readonly weekContext: WeekContext = { week: this.week };

    /** what it shows (`undefined` outside a time grid) */
    readonly state: Signal<AllDayRowState | undefined> = computed(() => {
        const week = this.week();
        return week ? { week } : undefined;
    });

    constructor() {
        const host = injectHost();
        bindPart(this.context, host, "all-day-row", () => {
            const week = this.week();
            return week ? { weekId: week.id } : undefined;
        });
        bindStructuralStyle(host, () => ({ position: "relative" }));
    }
}
