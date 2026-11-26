// The first instant of a date in a zone, which is not always 00:00: when midnight is skipped
// (Sao Paulo's DST began at 00:00 until 2018), the day starts when the gap ends. A day that is
// skipped whole (Apia, 2011-12-30) starts and ends at the same instant, the next day's start.
import type { Instant } from "../time/instant";
import type { PlainDate } from "../time/plain-date";
import { wallClockToEpoch } from "../time/wall-clock-epoch";
import { offsetMilliseconds } from "./time-zone-offset";
import { wallClockCandidates } from "./wall-clock-candidates";

/** The first instant at which `timeZone` shows `date` (or the next date, when `date` is skipped). */
export function startOfDay(date: PlainDate, timeZone: string): Instant {
    const local = wallClockToEpoch({
        year: date.year,
        month: date.month,
        day: date.day,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
    });
    const { instants, before, after } = wallClockCandidates(timeZone, local);
    const first = instants[0];
    if (first !== undefined) {
        return first as Instant;
    }
    // midnight is in a gap: the day starts at the transition, between the instants that read
    // midnight with the offset after it and with the offset before it (found to the second)
    let low = local - after;
    let high = local - before;
    while (high - low > 1000) {
        const middle = low + Math.floor((high - low) / 2000) * 1000;
        if (offsetMilliseconds(timeZone, middle) === before) {
            low = middle;
        } else {
            high = middle;
        }
    }
    return high as Instant;
}
