import type { FormatOptions } from "@fragiola/calendar";
import { type ComputedRef, type MaybeRefOrGetter, toValue } from "vue";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "./internal";

/**
 * A day's header as `Intl` parts in the calendar's locale (`get("day-header-by")`), a computed:
 * the weekday in a month view, the weekday and the day in a time grid. Render the parts' `value`s
 * yourself.
 */
export function useDayHeader(
    date: MaybeRefOrGetter<string>,
    format?: MaybeRefOrGetter<FormatOptions | undefined>,
): ComputedRef<readonly Intl.DateTimeFormatPart[]> {
    const context = useCalendarContext("useDayHeader");
    return useCalendarValue(context, () => {
        const day = toValue(date);
        const options = toValue(format);
        return (
            context.model.get(
                "day-header-by",
                options === undefined
                    ? { date: day }
                    : { date: day, format: options },
            ) ?? []
        );
    });
}
