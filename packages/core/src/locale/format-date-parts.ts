import { toEpochDay } from "../time/epoch-day";
import type { PlainDate } from "../time/plain-date";
import { dateTimeFormat, type FormatOptions } from "./date-time-format";

/**
 * A plain date as `Intl.DateTimeFormat` parts, for a day header (`{ weekday: "short", day:
 * "numeric" }`): data the app renders, never text in a primitive (D4, D19). The date is formatted
 * on its own, in UTC, so no zone can move it to another day.
 */
export function formatDateParts(
    date: PlainDate,
    locale: string,
    options: FormatOptions,
): Intl.DateTimeFormatPart[] {
    return dateTimeFormat(locale, "UTC", options).formatToParts(
        toEpochDay(date) * 86_400_000,
    );
}
