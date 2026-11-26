import type { Signal } from "@angular/core";
import type { BusinessHoursRange } from "@fragiola/calendar";
import {
    calendarValue,
    injectCalendarContext,
    type ValueOrSignal,
    valueNow,
} from "@fragiola/calendar-angular/internal";

/**
 * The business hours of the visible days (`constraints()`, `get("business-hours-in")`), each day's
 * as instants and time-grid fractions; only `date`'s when given (a value, a signal or a getter).
 */
export function injectBusinessHours(
    date?: ValueOrSignal<string | undefined>,
): Signal<readonly BusinessHoursRange[]> {
    const context = injectCalendarContext("injectBusinessHours");
    return calendarValue(context, () => {
        const all = context.model().get("business-hours-in") ?? [];
        const day = date === undefined ? undefined : valueNow(date);
        return day === undefined
            ? all
            : all.filter((range) => range.date === day);
    });
}
