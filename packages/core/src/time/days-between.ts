import { toEpochDay } from "./epoch-day";
import type { PlainDate } from "./plain-date";

/** The number of days from `start` to `end`: negative when `end` comes first. */
export function daysBetween(start: PlainDate, end: PlainDate): number {
    return toEpochDay(end) - toEpochDay(start);
}
