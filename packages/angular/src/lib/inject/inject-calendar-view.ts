import type { Signal } from "@angular/core";
import type { DateRangeJson, ViewType } from "@fragiola/calendar";
import {
    calendarValue,
    injectCalendarContext,
} from "@fragiola/calendar-angular/internal";

/** The view a calendar shows (`injectCalendarView`). */
export interface CalendarView {
    readonly type: ViewType;
    /** the date the view is built around, `YYYY-MM-DD` */
    readonly anchorDate: string;
    /** `days` views: how many days */
    readonly days: number | undefined;
    /** the days shown (a month's six weeks), end exclusive */
    readonly visibleRange: DateRangeJson;
    /** the range the view is about (the month itself), end exclusive */
    readonly currentRange: DateRangeJson;
}

/** The view of the enclosing `[calendarRoot]`, as a signal that changes with it. */
export function injectCalendarView(): Signal<CalendarView> {
    const context = injectCalendarContext("injectCalendarView");
    return calendarValue(
        context,
        () => {
            const model = context.model();
            const view = model.state.view;
            return {
                type: view.type,
                anchorDate: view.anchorDate,
                days: view.days,
                visibleRange: model.get("visible-range"),
                currentRange: model.get("current-range"),
            };
        },
        (a, b) =>
            a.type === b.type &&
            a.anchorDate === b.anchorDate &&
            a.days === b.days &&
            JSON.stringify([a.visibleRange, a.currentRange]) ===
                JSON.stringify([b.visibleRange, b.currentRange]),
    );
}
