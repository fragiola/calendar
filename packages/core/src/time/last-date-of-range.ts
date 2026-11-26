import { addDays } from "./add-days";
import type { DateRange } from "./date-range";
import type { PlainDate } from "./plain-date";

/** The last day a range includes: the day before its exclusive `end`. */
export function lastDateOfRange(range: DateRange): PlainDate {
    return addDays(range.end, -1);
}
