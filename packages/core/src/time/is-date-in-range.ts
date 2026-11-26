import { comparePlainDates } from "./compare-plain-dates";
import type { DateRange } from "./date-range";
import type { PlainDate } from "./plain-date";

/** Whether `date` is one of the range's days (its `end` is excluded). */
export function isDateInRange(date: PlainDate, range: DateRange): boolean {
    return (
        comparePlainDates(range.start, date) <= 0 &&
        comparePlainDates(date, range.end) < 0
    );
}
