import {
    computed,
    Directive,
    effect,
    type Signal,
    untracked,
} from "@angular/core";
import {
    bindPart,
    CALENDAR_WEEK,
    injectCalendarContext,
    injectHost,
    injectRequired,
} from "@fragiola/calendar-angular/internal";

export interface WeekNumberState {
    /** the row's week number, under the `weekNumbers` setting */
    weekNumber: number;
}

/**
 * The row header of a month's row (`role="rowheader"`), inside a `[calendarWeek]`: what it shows is
 * yours (`#number="calendarWeekNumber"`, then `number.state()?.weekNumber`). Give the root
 * `weekNumberColumn`, so the grid counts its column (a missing one warns once).
 */
@Directive({ selector: "[calendarWeekNumber]", exportAs: "calendarWeekNumber" })
export class CalendarWeekNumberDirective {
    private readonly context = injectCalendarContext("[calendarWeekNumber]");
    private readonly row = injectRequired(
        CALENDAR_WEEK,
        "[calendarWeekNumber]",
        "[calendarWeek]",
    );

    /** what it shows (`undefined` until its row is known) */
    readonly state: Signal<WeekNumberState | undefined> = computed(() => {
        const week = this.row.week();
        return week ? { weekNumber: week.weekNumber } : undefined;
    });

    constructor() {
        bindPart(this.context, injectHost(), "week-number", () => {
            const week = this.row.week();
            return week ? { weekId: week.id } : undefined;
        });
        effect(() => {
            if (this.context.partOptions().weekNumberColumn) return;
            untracked(() =>
                this.context.warn(
                    "[calendarWeekNumber] is rendered without the root's weekNumberColumn: the grid does not count its column (aria-colcount)",
                ),
            );
        });
    }
}
