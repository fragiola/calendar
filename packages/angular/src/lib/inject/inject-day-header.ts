import type { Signal } from "@angular/core";
import type { FormatOptions } from "@fragiola/calendar";
import {
    calendarValue,
    injectCalendarContext,
    type ValueOrSignal,
    valueNow,
} from "@fragiola/calendar-angular/internal";

/**
 * A day's header as `Intl` parts in the calendar's locale (`get("day-header-by")`): the weekday
 * in a month view, the weekday and the day in a time grid. Render the parts' `value`s yourself.
 * `date` may be a signal or a getter (a component's input).
 */
export function injectDayHeader(
    date: ValueOrSignal<string>,
    format?: ValueOrSignal<FormatOptions | undefined>,
): Signal<readonly Intl.DateTimeFormatPart[]> {
    const context = injectCalendarContext("injectDayHeader");
    return calendarValue(
        context,
        () => {
            const day = valueNow(date);
            const options = format === undefined ? undefined : valueNow(format);
            return (
                context
                    .model()
                    .get(
                        "day-header-by",
                        options === undefined
                            ? { date: day }
                            : { date: day, format: options },
                    ) ?? []
            );
        },
        { part: "column-header" },
    );
}
