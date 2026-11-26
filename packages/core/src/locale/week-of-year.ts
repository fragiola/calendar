// Week numbering under any week rule: a week belongs to the year holding at least `minimalDays`
// of its days, and week 1 is the first such week. ISO 8601 is Monday and 4; the US is Sunday and 1.
// The week's year can differ from the date's near January 1 (2024-12-30 is ISO week 1 of 2025).
import { addDays } from "../time/add-days";
import { dayOfWeek, type Weekday } from "../time/day-of-week";
import { daysBetween } from "../time/days-between";
import type { PlainDate } from "../time/plain-date";

/** A week number and the year it numbers. */
export interface WeekOfYear {
    readonly week: number;
    readonly year: number;
}

/** The rules a week number needs (a `WeekInfo` is one). */
export interface WeekRules {
    readonly firstDay: Weekday;
    readonly minimalDays: number;
}

/** The first day of week 1 of `year`. */
function firstWeekStart(year: number, rules: WeekRules): PlainDate {
    const january = { year, month: 1, day: 1 };
    const intoWeek = (dayOfWeek(january) - rules.firstDay + 7) % 7;
    // the week holding January 1 has 7 - intoWeek days of the year
    const start = addDays(january, -intoWeek);
    return 7 - intoWeek >= rules.minimalDays ? start : addDays(start, 7);
}

/** The week number of a date under a week's rules. */
export function weekOfYear(date: PlainDate, rules: WeekRules): WeekOfYear {
    const weekStart = addDays(
        date,
        -((dayOfWeek(date) - rules.firstDay + 7) % 7),
    );
    // the week is numbered by the year of its last day if it holds enough of that year's days
    let year = addDays(weekStart, 6).year;
    if (daysBetween(firstWeekStart(year, rules), weekStart) < 0) {
        year -= 1;
    }
    return {
        week: daysBetween(firstWeekStart(year, rules), weekStart) / 7 + 1,
        year,
    };
}
