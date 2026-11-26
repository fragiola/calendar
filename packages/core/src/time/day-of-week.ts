import { toEpochDay } from "./epoch-day";
import type { PlainDate } from "./plain-date";

/** A day of the week, 0 = Sunday … 6 = Saturday (the document's `firstDayOfWeek` numbering). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** The day of the week of a date (1970-01-01 was a Thursday). */
export function dayOfWeek(date: PlainDate): Weekday {
    return ((((toEpochDay(date) + 4) % 7) + 7) % 7) as Weekday;
}
