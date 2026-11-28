import type { FormatOptions } from "@fragiola/calendar";
import { type ComputedRef, type MaybeRefOrGetter, toValue } from "vue";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "./internal";

/**
 * The view's title as `Intl` parts in the calendar's locale (`get("title-parts")`), a computed: a
 * month view's month, another view's days. The title is data: render the parts' `value`s
 * yourself.
 */
export function useCalendarTitle(
    format?: MaybeRefOrGetter<FormatOptions | undefined>,
): ComputedRef<readonly Intl.DateTimeRangeFormatPart[]> {
    const context = useCalendarContext("useCalendarTitle");
    return useCalendarValue(
        context,
        () => {
            const options = toValue(format);
            return context.model.get(
                "title-parts",
                options === undefined ? {} : { format: options },
            );
        },
        { part: "root" },
    );
}
