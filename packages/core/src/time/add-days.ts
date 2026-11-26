import { fromEpochDay, toEpochDay } from "./epoch-day";
import type { PlainDate } from "./plain-date";

/** The date `days` days after `date` (before it when negative). */
export function addDays(date: PlainDate, days: number): PlainDate {
    return fromEpochDay(toEpochDay(date) + days);
}
