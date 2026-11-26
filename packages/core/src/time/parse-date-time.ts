// RFC 3339 `date-time` (section 5.6), strictly: `YYYY-MM-DDTHH:mm:ss`, optional fraction, and an
// offset (`Z` or `±HH:mm`) always. No space for `T`, no lowercase, no missing seconds, no leap
// second (`:60` cannot be an instant here), no offset-less local time: each is an issue (D4).
// Never `new Date(string)`, whose accepted formats depend on the engine.
import { invalid, type ValidationResult } from "../document/validation-issue";
import type { Instant } from "./instant";
import { isPlainDate } from "./is-plain-date";
import type { OffsetDateTime } from "./offset-date-time";
import { wallClockToEpoch } from "./wall-clock-epoch";

const DATE_TIME =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(?:(Z)|([+-])(\d{2}):(\d{2}))$/;

const EXPECTED =
    "an RFC 3339 date-time with its offset (2026-11-26T09:30:00-03:00)";

/**
 * An RFC 3339 date-time with an offset, or the issue at `path`. A fraction finer than milliseconds
 * is truncated to them (an `Instant` holds milliseconds).
 */
export function parseDateTime(
    value: unknown,
    path = "",
): ValidationResult<OffsetDateTime> {
    if (typeof value !== "string") {
        return invalid(path, `expected ${EXPECTED}`);
    }
    const match = DATE_TIME.exec(value);
    if (!match) {
        return invalid(path, `"${value}" is not ${EXPECTED}`);
    }
    const [, year, month, day, hour, minute, second, fraction, zulu, sign] =
        match;
    const date = { year: Number(year), month: Number(month), day: Number(day) };
    const offsetHours = Number(match[10] ?? 0);
    const offsetMinutes = Number(match[11] ?? 0);
    if (
        !isPlainDate(date) ||
        Number(hour) > 23 ||
        Number(minute) > 59 ||
        Number(second) > 59 ||
        offsetHours > 23 ||
        offsetMinutes > 59
    ) {
        return invalid(path, `"${value}" is out of range for ${EXPECTED}`);
    }
    // `-00:00` (RFC 3339: the local offset is unknown) is the same instant as `Z`
    const offset =
        zulu === undefined && offsetHours + offsetMinutes > 0
            ? (sign === "-" ? -1 : 1) * (offsetHours * 60 + offsetMinutes)
            : 0;
    const local = wallClockToEpoch({
        ...date,
        hour: Number(hour),
        minute: Number(minute),
        second: Number(second),
        millisecond: Number((fraction ?? "").padEnd(3, "0").slice(0, 3)),
    });
    return {
        ok: true,
        value: { instant: (local - offset * 60_000) as Instant, offset },
    };
}
