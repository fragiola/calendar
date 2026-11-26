import type { FormatOptions } from "@fragiola/calendar";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "./internal";

/**
 * A day's header as `Intl` parts in the calendar's locale (`get("day-header-by")`): the weekday
 * in a month view, the weekday and the day in a time grid. Render the parts' `value`s yourself.
 */
export function useDayHeader(
    date: string,
    format?: FormatOptions,
): readonly Intl.DateTimeFormatPart[] {
    const context = useCalendarContext("useDayHeader");
    return useCalendarValue(
        context,
        () =>
            context.model.get(
                "day-header-by",
                format === undefined ? { date } : { date, format },
            ) ?? [],
    );
}
