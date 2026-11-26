import { computed, Directive, inject, input, type Signal } from "@angular/core";
import type { DayGridWeek } from "@fragiola/calendar";
import {
    beforeInputs,
    bindPart,
    bindStructuralStyle,
    CALENDAR_WEEK,
    injectCalendarContext,
    injectHost,
    type WeekContext,
} from "@fragiola/calendar-angular/internal";

export interface WeekState {
    week: DayGridWeek;
}

/**
 * A row of a month (`role="row"`): `<div [calendarWeek]="week">`, its days
 * (`<ng-template calendarDays let-day>`), and a `[calendarWeekNumber]` if you render one. It is the
 * containing block (`position: relative`) of its decorations (`*calendarSelection`,
 * `*calendarDragPreview`).
 */
@Directive({
    selector: "[calendarWeek]",
    exportAs: "calendarWeek",
    providers: [
        {
            provide: CALENDAR_WEEK,
            useFactory: () => inject(CalendarWeekDirective).weekContext,
        },
    ],
})
export class CalendarWeekDirective {
    /** the row, from `<ng-template calendarWeeks let-week>` */
    readonly calendarWeek = input.required<DayGridWeek>();

    private readonly context = injectCalendarContext("[calendarWeek]");
    private readonly week = computed(() =>
        beforeInputs(undefined, this.calendarWeek),
    );

    /** @internal what the parts inside read */
    readonly weekContext: WeekContext = { week: this.week };

    /** what it shows (`#row="calendarWeek"`, then `row.state().week`) */
    readonly state: Signal<WeekState | undefined> = computed(() => {
        const week = this.week();
        return week ? { week } : undefined;
    });

    constructor() {
        const host = injectHost();
        bindPart(this.context, host, "week", () => {
            const week = this.week();
            return week ? { weekId: week.id } : undefined;
        });
        bindStructuralStyle(host, () => ({ position: "relative" }));
    }
}
