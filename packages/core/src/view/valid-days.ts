// The `validRange` setting as epoch days: navigation may not leave it (D7), and its days outside
// are `disabled` (D17). An open edge is infinite.
import type { CalendarSettings } from "../document/calendar-settings";
import { toEpochDay } from "../time/epoch-day";
import { parsePlainDate } from "../time/parse-plain-date";
import type { DayRange } from "./view-days";

function dayOf(value: string | undefined, open: number): number {
    if (value === undefined) return open;
    const parsed = parsePlainDate(value);
    return parsed.ok ? toEpochDay(parsed.value) : open;
}

/** The days the calendar may show, `end` exclusive (everything without a `validRange`). */
export function validDays(settings: CalendarSettings): DayRange {
    const range = settings.validRange;
    return {
        start: dayOf(range?.start, Number.NEGATIVE_INFINITY),
        end: dayOf(range?.end, Number.POSITIVE_INFINITY),
    };
}

/** Whether a day is inside the valid range. */
export function isValidDay(day: number, valid: DayRange): boolean {
    return day >= valid.start && day < valid.end;
}

/** Whether a range shares a day with the valid range. */
export function touchesValid(range: DayRange, valid: DayRange): boolean {
    return range.start < valid.end && valid.start < range.end;
}
