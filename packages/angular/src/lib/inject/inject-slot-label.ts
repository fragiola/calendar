import type { Signal } from "@angular/core";
import type { FormatOptions } from "@fragiola/calendar";
import {
    calendarValue,
    injectCalendarContext,
    type ValueOrSignal,
    valueNow,
} from "@fragiola/calendar-angular/internal";

/**
 * A slot's time (`HH:mm`) as `Intl` parts in the calendar's locale (`get("slot-label-by")`).
 * Render the parts' `value`s yourself. `time` may be a signal or a getter.
 */
export function injectSlotLabel(
    time: ValueOrSignal<string>,
    format?: ValueOrSignal<FormatOptions | undefined>,
): Signal<readonly Intl.DateTimeFormatPart[]> {
    const context = injectCalendarContext("injectSlotLabel");
    return calendarValue(
        context,
        () => {
            const at = valueNow(time);
            const options = format === undefined ? undefined : valueNow(format);
            return (
                context
                    .model()
                    .get(
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
