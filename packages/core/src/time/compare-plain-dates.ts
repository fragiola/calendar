import type { PlainDate } from "./plain-date";

/** Negative when `a` is before `b`, zero when they are the same date, positive after. */
export function comparePlainDates(a: PlainDate, b: PlainDate): number {
    return a.year - b.year || a.month - b.month || a.day - b.day;
}
