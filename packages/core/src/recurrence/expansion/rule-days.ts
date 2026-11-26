// The days a rule gives (RFC 5545 §3.3.10's expansion, written fresh from the RFC text): a rule
// names periods (days, weeks from WKST, months, years) every INTERVAL; within a period, BYMONTH,
// BYMONTHDAY and BYDAY expand or limit as the RFC's table says (BYDAY counts its ordinals within
// the month, or within the year in a yearly rule without BYMONTH; with BYMONTHDAY it limits); a
// period without them repeats the start's own day. Days that do not exist (February 30) are
// skipped. The event's own start is always the first day (RFC 5545 §3.8.5.3), even when the rule
// does not give it. Days are epoch days; times of day are the series' (`series.ts`).
import type { Weekday } from "../../time/day-of-week";
import { daysInMonth } from "../../time/days-in-month";
import { fromEpochDay, toEpochDay } from "../../time/epoch-day";
import type {
    RecurrenceRule,
    RecurrenceWeekday,
} from "../rule/recurrence-rule";

/** The last day a date can be written on (9999-12-31). */
const LAST_DAY = toEpochDay({ year: 9999, month: 12, day: 31 });

function weekdayOf(day: number): Weekday {
    return ((((day + 4) % 7) + 7) % 7) as Weekday;
}

function firstOfMonth(year: number, month: number): number {
    return toEpochDay({ year, month, day: 1 });
}

/** The days of `[start, end)` that `byDay` names, ordinals counted within the span. */
function byDayIn(
    start: number,
    end: number,
    byDay: readonly RecurrenceWeekday[],
): number[] {
    const days: number[] = [];
    for (const { weekday, ordinal } of byDay) {
        const first = start + ((weekday - weekdayOf(start) + 7) % 7);
        if (ordinal === undefined) {
            for (let day = first; day < end; day += 7) days.push(day);
        } else if (ordinal > 0) {
            const day = first + 7 * (ordinal - 1);
            if (day < end) days.push(day);
        } else {
            const last = end - 1 - ((weekdayOf(end - 1) - weekday + 7) % 7);
            const day = last + 7 * (ordinal + 1);
            if (day >= start) days.push(day);
        }
    }
    return days;
}

/** The days of a month that `byMonthDay` names (negative from its end), those that exist. */
function monthDaysIn(
    year: number,
    month: number,
    byMonthDay: readonly number[],
): number[] {
    const length = daysInMonth(year, month);
    const first = firstOfMonth(year, month);
    const days: number[] = [];
    for (const n of byMonthDay) {
        const day = n > 0 ? n : length + 1 + n;
        if (day >= 1 && day <= length) days.push(first + day - 1);
    }
    return days;
}

/** The days of a month the rule gives (MONTHLY, or a yearly rule's BYMONTH). */
function inMonth(
    rule: RecurrenceRule,
    year: number,
    month: number,
    startDate: number,
): number[] {
    const first = firstOfMonth(year, month);
    const end = first + daysInMonth(year, month);
    if (rule.byMonthDay) {
        const days = monthDaysIn(year, month, rule.byMonthDay);
        if (!rule.byDay) return days;
        const allowed = new Set(byDayIn(first, end, rule.byDay));
        return days.filter((day) => allowed.has(day));
    }
    if (rule.byDay) return byDayIn(first, end, rule.byDay);
    return startDate <= daysInMonth(year, month) ? [first + startDate - 1] : [];
}

/** Whether a day passes the rule's limiting parts for a daily or weekly rule. */
function limitedOut(rule: RecurrenceRule, day: number): boolean {
    if (rule.byMonth || rule.byMonthDay) {
        const date = fromEpochDay(day);
        if (rule.byMonth && !rule.byMonth.includes(date.month)) return true;
        if (
            rule.byMonthDay &&
            monthDaysIn(date.year, date.month, rule.byMonthDay).indexOf(day) < 0
        ) {
            return true;
        }
    }
    return rule.freq === "DAILY" && rule.byDay !== undefined
        ? !rule.byDay.some((entry) => entry.weekday === weekdayOf(day))
        : false;
}

/** A rule's periods: the first day of period `p`, and the days it gives (unsorted). */
interface Periods {
    readonly at: (p: number) => number;
    readonly days: (p: number) => number[];
    /** the period holding `day` (or the last before it) */
    readonly indexOf: (day: number) => number;
}

function periodsOf(rule: RecurrenceRule, start: number): Periods {
    const date = fromEpochDay(start);
    const n = rule.interval;
    switch (rule.freq) {
        case "DAILY":
            return {
                at: (p) => start + p * n,
                days: (p) => {
                    const day = start + p * n;
                    return limitedOut(rule, day) ? [] : [day];
                },
                indexOf: (day) => Math.floor((day - start) / n),
            };
        case "WEEKLY": {
            const week = start - ((weekdayOf(start) - rule.weekStart + 7) % 7);
            const weekdays = rule.byDay
                ? rule.byDay.map((entry) => entry.weekday)
                : [weekdayOf(start)];
            return {
                at: (p) => week + 7 * n * p,
                days: (p) => {
                    const first = week + 7 * n * p;
                    return weekdays
                        .map(
                            (weekday) =>
                                first + ((weekday - rule.weekStart + 7) % 7),
                        )
                        .filter((day) => !limitedOut(rule, day));
                },
                indexOf: (day) => Math.floor((day - week) / (7 * n)),
            };
        }
        case "MONTHLY": {
            const base = date.year * 12 + date.month - 1;
            const monthOf = (p: number) => {
                const index = base + p * n;
                return {
                    year: Math.floor(index / 12),
                    month: (index % 12) + 1,
                };
            };
            return {
                at: (p) => {
                    const { year, month } = monthOf(p);
                    return firstOfMonth(year, month);
                },
                days: (p) => {
                    const { year, month } = monthOf(p);
                    if (rule.byMonth && !rule.byMonth.includes(month))
                        return [];
                    return inMonth(rule, year, month, date.day);
                },
                indexOf: (day) => {
                    const at = fromEpochDay(day);
                    return Math.floor((at.year * 12 + at.month - 1 - base) / n);
                },
            };
        }
        case "YEARLY":
            return {
                at: (p) => firstOfMonth(date.year + p * n, 1),
                days: (p) => {
                    const year = date.year + p * n;
                    if (rule.byMonth) {
                        return rule.byMonth.flatMap((month) =>
                            inMonth(rule, year, month, date.day),
                        );
                    }
                    if (rule.byMonthDay) {
                        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].flatMap(
                            (month) => inMonth(rule, year, month, date.day),
                        );
                    }
                    if (rule.byDay) {
                        return byDayIn(
                            firstOfMonth(year, 1),
                            firstOfMonth(year + 1, 1),
                            rule.byDay,
                        );
                    }
                    return inMonth(rule, year, date.month, date.day);
                },
                indexOf: (day) =>
                    Math.floor((fromEpochDay(day).year - date.year) / n),
            };
    }
}

/**
 * The days of a rule from its start day, in order, each once: the start first, then every day
 * the rule gives after it, until a period starts after `last` (or the years end). With `from`
 * (a rule without COUNT: none before it needs counting), the periods before it are skipped.
 */
export function* ruleDays(
    rule: RecurrenceRule,
    start: number,
    last: number,
    from = start,
): Generator<number> {
    const periods = periodsOf(rule, start);
    let p = Math.max(0, periods.indexOf(from) - 1);
    if (p === 0) yield start;
    const end = Math.min(last, LAST_DAY);
    for (; periods.at(p) <= end; p++) {
        const days = [...new Set(periods.days(p))].sort((a, b) => a - b);
        for (const day of days) {
            if (day > start && day <= LAST_DAY) yield day;
        }
    }
}
