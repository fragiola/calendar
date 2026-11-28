import type { FormatOptions } from "@fragiola/calendar";
import { type ComputedRef, type MaybeRefOrGetter, toValue } from "vue";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "./internal";

/**
 * A slot's time (`HH:mm`) as `Intl` parts in the calendar's locale (`get("slot-label-by")`), a
 * computed. Render the parts' `value`s yourself.
 */
export function useSlotLabel(
    time: MaybeRefOrGetter<string>,
    format?: MaybeRefOrGetter<FormatOptions | undefined>,
): ComputedRef<readonly Intl.DateTimeFormatPart[]> {
    const context = useCalendarContext("useSlotLabel");
    return useCalendarValue(
        context,
        () => {
            const at = toValue(time);
            const options = toValue(format);
            return (
                context.model.get(
                    "slot-label-by",
                    options === undefined
                        ? { time: at }
                        : { time: at, format: options },
                ) ?? []
            );
        },
        { part: "slot-label" },
    );
}
