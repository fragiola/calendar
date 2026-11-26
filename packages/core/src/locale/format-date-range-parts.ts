import type { DateRange } from "../time/date-range";
import { toEpochDay } from "../time/epoch-day";
import { dateTimeFormat, type FormatOptions } from "./date-time-format";

/**
 * A view's title as `Intl.DateTimeFormat#formatRangeToParts` parts, from the range's first day to
 * its last (the day before its exclusive `end`): `Nov 22 – 28, 2026`. Each part says whether it
 * belongs to the start, the end or both (`source`).
 */
export function formatDateRangeParts(
    range: DateRange,
    locale: string,
    options: FormatOptions,
): Intl.DateTimeRangeFormatPart[] {
    const start = toEpochDay(range.start);
    const last = Math.max(start, toEpochDay(range.end) - 1);
    return dateTimeFormat(locale, "UTC", options).formatRangeToParts(
        start * 86_400_000,
        last * 86_400_000,
    );
}
