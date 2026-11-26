import { formatDateTime } from "../time/format-date-time";
import type { Instant } from "../time/instant";
import type { DateTimeString } from "../time/offset-date-time";
import { offsetMilliseconds } from "./time-zone-offset";

/**
 * An instant as RFC 3339 with the offset `timeZone` has then (`2026-11-26T09:30:00-03:00`), the
 * form the document stores. An offset holding seconds (historic local mean time) is rounded to
 * the minute, and the wall clock written with it, so the string is still the same instant.
 */
export function formatInstant(at: Instant, timeZone: string): DateTimeString {
    return formatDateTime(
        at,
        Math.round(offsetMilliseconds(timeZone, at) / 60_000),
    );
}
