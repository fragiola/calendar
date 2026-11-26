// The days a timed occurrence shows on, from its wall clock in the display zone. An end exactly at
// midnight does not reach the next day (ends are exclusive), and an end before `nextDayThreshold`
// (wall-clock minutes after midnight, FullCalendar's documented behaviour) does not either; an
// occurrence always shows on at least the day it starts.
import { addDays } from "./add-days";
import { comparePlainDates } from "./compare-plain-dates";
import type { DateRange } from "./date-range";
import type { ZonedDateTimeFields } from "./zoned-date-time-fields";

/** The days (exclusive end) a timed occurrence from `start` to `end` covers. */
export function timedDayRange(
    start: ZonedDateTimeFields,
    end: ZonedDateTimeFields,
    nextDayThreshold = 0,
): DateRange {
    const startDate = { year: start.year, month: start.month, day: start.day };
    const endDate = { year: end.year, month: end.month, day: end.day };
    const endTime =
        end.hour * 3_600_000 +
        end.minute * 60_000 +
        end.second * 1000 +
        end.millisecond;
    const reachesEndDay = endTime > 0 && endTime >= nextDayThreshold * 60_000;
    const last = reachesEndDay ? addDays(endDate, 1) : endDate;
    return {
        start: startDate,
        end:
            comparePlainDates(last, startDate) > 0
                ? last
                : addDays(startDate, 1),
    };
}
