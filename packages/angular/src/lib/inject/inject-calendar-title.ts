import type { Signal } from "@angular/core";
import type { FormatOptions } from "@fragiola/calendar";
import {
    calendarValue,
    injectCalendarContext,
    type ValueOrSignal,
    valueNow,
} from "@fragiola/calendar-angular/internal";

/**
 * The view's title as `Intl` parts in the calendar's locale (`get("title-parts")`): a month
 * view's month, another view's days. The title is data: render the parts' `value`s yourself.
 */
export function injectCalendarTitle(
    format?: ValueOrSignal<FormatOptions | undefined>,
): Signal<readonly Intl.DateTimeRangeFormatPart[]> {
    const context = injectCalendarContext("injectCalendarTitle");
    return calendarValue(
        context,
        () => {
            const options = format === undefined ? undefined : valueNow(format);
            return context
                .model()
                .get(
                    "title-parts",
                    options === undefined ? {} : { format: options },
                );
        },
        { part: "root" },
    );
}
