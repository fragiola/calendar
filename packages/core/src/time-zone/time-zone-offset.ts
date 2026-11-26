// A zone's offset at an instant, read from `Intl.DateTimeFormat#formatToParts` (the engine's own
// zone data: no table here, D4): the wall clock the zone shows, counted as if it were UTC, minus
// the instant. Offsets are cached per zone and UTC hour; an hour holding a transition (its first
// and last second disagree, as Lord Howe's at :30) is never cached and is read to the second.
import type { Instant } from "../time/instant";
import { wallClockToEpoch } from "../time/wall-clock-epoch";

const MS_PER_HOUR = 3_600_000;
/** A cache entry for an hour that holds a transition: read each instant instead. */
const TRANSITION = Number.NaN;
/** Hours kept per zone before the cache starts over (about 11 years of hours). */
const MAX_HOURS = 100_000;

const formatters = new Map<string, Intl.DateTimeFormat>();
const offsets = new Map<string, Map<number, number>>();

function formatterOf(timeZone: string): Intl.DateTimeFormat {
    let formatter = formatters.get(timeZone);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat("en-US", {
            timeZone,
            hourCycle: "h23",
            era: "short",
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
        });
        formatters.set(timeZone, formatter);
    }
    return formatter;
}

/** The offset in milliseconds at an instant, read to the second (no cache). */
function readOffset(timeZone: string, at: number): number {
    const second = Math.floor(at / 1000) * 1000;
    const fields = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
    let before = false;
    for (const part of formatterOf(timeZone).formatToParts(second)) {
        if (part.type === "era") {
            before = part.value === "BC" || part.value === "B";
        } else if (part.type in fields) {
            fields[part.type as keyof typeof fields] = Number(part.value);
        }
    }
    const year = before ? 1 - fields.year : fields.year;
    return wallClockToEpoch({ ...fields, year, millisecond: 0 }) - second;
}

/** The offset of `timeZone` at `at` in milliseconds (internal: exact, may hold seconds). */
export function offsetMilliseconds(timeZone: string, at: number): number {
    let hours = offsets.get(timeZone);
    if (!hours) {
        hours = new Map();
        offsets.set(timeZone, hours);
    }
    const hour = Math.floor(at / MS_PER_HOUR);
    let offset = hours.get(hour);
    if (offset === undefined) {
        const start = readOffset(timeZone, hour * MS_PER_HOUR);
        const end = readOffset(timeZone, (hour + 1) * MS_PER_HOUR - 1000);
        offset = start === end ? start : TRANSITION;
        if (hours.size >= MAX_HOURS) {
            hours.clear();
        }
        hours.set(hour, offset);
    }
    return Number.isNaN(offset) ? readOffset(timeZone, at) : offset;
}

/**
 * The offset of an IANA zone at an instant, in minutes east of UTC (`America/Sao_Paulo` today:
 * -180). Historic local mean times may hold seconds, so the minutes may be fractional before
 * standard time. An unknown zone is a `RangeError` (validate it first: `validateTimeZone`).
 */
export function timeZoneOffset(timeZone: string, at: Instant): number {
    return offsetMilliseconds(timeZone, at) / 60_000;
}
