import type { Instant } from "../time/instant";
import { dateTimeFormat, type FormatOptions } from "./date-time-format";

/** An instant as `Intl.DateTimeFormat` parts on a zone's wall clock (an event's start time). */
export function formatInstantParts(
    at: Instant,
    timeZone: string,
    locale: string,
    options: FormatOptions,
): Intl.DateTimeFormatPart[] {
    return dateTimeFormat(locale, timeZone, options).formatToParts(at);
}
