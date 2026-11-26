import { comparePlainDates } from "./compare-plain-dates";
import type { DateRange } from "./date-range";

/** Whether two ranges share a day (ranges that only touch, one's end the other's start, do not). */
export function dateRangesOverlap(a: DateRange, b: DateRange): boolean {
    return (
        comparePlainDates(a.start, b.end) < 0 &&
        comparePlainDates(b.start, a.end) < 0
    );
}
