import { daysInMonth } from "./days-in-month";
import type { PlainDate } from "./plain-date";

/** The date `months` months after `date`, its day clamped to the month's end (Jan 31 + 1 → Feb 28). */
export function addMonths(date: PlainDate, months: number): PlainDate {
    const index = date.year * 12 + date.month - 1 + months;
    const year = Math.floor(index / 12);
    const month = index - year * 12 + 1;
    return { year, month, day: Math.min(date.day, daysInMonth(year, month)) };
}
