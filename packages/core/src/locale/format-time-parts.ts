import type { PlainTime } from "../time/plain-time";
import { dateTimeFormat, type FormatOptions } from "./date-time-format";

/**
 * A time of day as `Intl.DateTimeFormat` parts, for a slot label (`{ hour: "numeric", minute:
 * "2-digit" }`): a wall-clock time, so it exists even on a day whose DST gap skips it.
 */
export function formatTimeParts(
    time: PlainTime,
    locale: string,
    options: FormatOptions,
): Intl.DateTimeFormatPart[] {
    return dateTimeFormat(locale, "UTC", options).formatToParts(
        (time.hour * 60 + time.minute) * 60_000,
    );
}
