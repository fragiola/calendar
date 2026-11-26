import type { FormatOptions } from "@fragiola/calendar";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "./internal";

/**
 * A slot's time (`HH:mm`) as `Intl` parts in the calendar's locale (`get("slot-label-by")`).
 * Render the parts' `value`s yourself.
 */
export function useSlotLabel(
    time: string,
    format?: FormatOptions,
): readonly Intl.DateTimeFormatPart[] {
    const context = useCalendarContext("useSlotLabel");
    return useCalendarValue(
        context,
        () =>
            context.model.get(
                "slot-label-by",
                format === undefined ? { time } : { time, format },
            ) ?? [],
    );
}
