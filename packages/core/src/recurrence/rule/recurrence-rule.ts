// A recurrence rule as the model reads it (D15): RFC 5545's RRULE (§3.3.10), the subset the
// calendar expands. Plain, JSON-shaped data an app can show (`parseRecurrenceRule`).
import type { Weekday } from "../../time/day-of-week";

/** How often a rule repeats (`HOURLY` and finer are not in the subset). */
export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

/** A day of `BYDAY`: a weekday (0 = Sunday), and for a monthly or yearly rule its ordinal (`2TU`, `-1FR`). */
export interface RecurrenceWeekday {
    readonly weekday: Weekday;
    /** the n-th (1…53) or n-th from the end (-1…-53) of the month or the year; absent: every one */
    readonly ordinal?: number;
}

/** A parsed RRULE. */
export interface RecurrenceRule {
    readonly freq: RecurrenceFrequency;
    /** every how many periods (default 1) */
    readonly interval: number;
    /** how many occurrences, the event's own start the first */
    readonly count?: number;
    /** the last start allowed (inclusive): a date (`YYYY-MM-DD`) or a UTC date-time (RFC 3339, `Z`) */
    readonly until?: string;
    readonly byDay?: readonly RecurrenceWeekday[];
    /** days of the month, 1…31 or -1…-31 from its end */
    readonly byMonthDay?: readonly number[];
    /** months, 1…12 */
    readonly byMonth?: readonly number[];
    /** the first day of a week (`WKST`, default Monday): a weekly rule's periods */
    readonly weekStart: Weekday;
}
