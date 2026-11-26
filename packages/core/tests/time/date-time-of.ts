// Shared test setup: the instant of an RFC 3339 string, and wall-clock fields, written as the
// document writes them so each expectation reads as a date.
import type { Instant } from "../../src/time/instant";
import { parseDateTime } from "../../src/time/parse-date-time";
import type { ZonedDateTimeFields } from "../../src/time/zoned-date-time-fields";

/** The instant of an RFC 3339 date-time (throws on a typo in a test). */
export function at(text: string): Instant {
    const result = parseDateTime(text);
    if (!result.ok) {
        throw new Error(`bad fixture ${text}`);
    }
    return result.value.instant;
}

/** Wall-clock fields from `YYYY-MM-DDTHH:mm` (or `HH:mm:ss`). */
export function wall(text: string): ZonedDateTimeFields {
    const [date = "", time = ""] = text.split("T");
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute, second = 0] = time.split(":").map(Number);
    return {
        year: year ?? 0,
        month: month ?? 0,
        day: day ?? 0,
        hour: hour ?? 0,
        minute: minute ?? 0,
        second,
        millisecond: 0,
    };
}

/** A plain date from `YYYY-MM-DD`. */
export function date(text: string) {
    const [year = 0, month = 0, day = 0] = text.split("-").map(Number);
    return { year, month, day };
}
