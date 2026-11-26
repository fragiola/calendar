import type { FormatOptions } from "@fragiola/calendar";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "./internal";

/**
 * The view's title as `Intl` parts in the calendar's locale (`get("title-parts")`): a month
 * view's month, another view's days. The title is data: render the parts' `value`s yourself.
 */
export function useCalendarTitle(
    format?: FormatOptions,
): readonly Intl.DateTimeRangeFormatPart[] {
    const context = useCalendarContext("useCalendarTitle");
    return useCalendarValue(context, () =>
        context.model.get(
            "title-parts",
            format === undefined ? {} : { format },
        ),
    );
}
