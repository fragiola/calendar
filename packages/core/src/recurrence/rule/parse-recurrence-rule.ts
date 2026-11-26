// The RRULE parser (RFC 5545 §3.3.10), written from the RFC: `NAME=VALUE` parts joined by `;`,
// names and values case-insensitive. The subset (D15): FREQ (DAILY, WEEKLY, MONTHLY, YEARLY),
// INTERVAL, COUNT, UNTIL, BYDAY (ordinals for monthly and yearly rules), BYMONTHDAY, BYMONTH,
// WKST. Anything else is an issue naming the part; nonsense (COUNT with UNTIL, BYMONTHDAY in a
// weekly rule, an ordinal in a daily one) is refused, never repaired.
import type {
    ValidationIssue,
    ValidationResult,
} from "../../document/validation-issue";
import type { Weekday } from "../../time/day-of-week";
import { daysInMonth } from "../../time/days-in-month";
import { pad } from "../../time/pad";
import type {
    RecurrenceFrequency,
    RecurrenceRule,
    RecurrenceWeekday,
} from "./recurrence-rule";
import { weekdayOfCode } from "./weekday-codes";

const SUBSET = "FREQ, INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY, BYMONTH, WKST";

/** RFC 5545's rule parts the subset leaves out. */
const UNSUPPORTED = new Set([
    "BYSECOND",
    "BYMINUTE",
    "BYHOUR",
    "BYWEEKNO",
    "BYYEARDAY",
    "BYSETPOS",
    "RSCALE",
    "SKIP",
]);

const FREQUENCIES = new Set(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);
const FINER = new Set(["SECONDLY", "MINUTELY", "HOURLY"]);

const INTEGER = /^[+-]?\d{1,3}$/;
const UNTIL = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/;
const BYDAY = /^([+-]?\d{1,2})?([A-Z]{2})$/;

/** `UNTIL`'s value as a date or a UTC date-time, `"floating"` for a local time, `""` for none. */
function untilOf(value: string): string {
    const match = UNTIL.exec(value);
    if (!match) return "";
    const [, y, m, d, hh, mm, ss, z] = match;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
        return "";
    }
    const date = `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
    if (hh === undefined) return date;
    if (z === undefined) return "floating";
    if (Number(hh) > 23 || Number(mm) > 59 || Number(ss) > 59) return "";
    return `${date}T${hh}:${mm}:${ss}Z`;
}

/** A list of integers within ±`max`, none 0 (or 1…`max` when `positive`), or `undefined`. */
function integers(
    value: string,
    max: number,
    positive: boolean,
): number[] | undefined {
    const list: number[] = [];
    for (const item of value.split(",")) {
        if (!INTEGER.test(item)) return undefined;
        const n = Number(item);
        if (n === 0 || Math.abs(n) > max || (positive && n < 0)) {
            return undefined;
        }
        list.push(n);
    }
    return list;
}

/**
 * Parses an RRULE value (`FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20270101T000000Z`, without `RRULE:`):
 * the rule, or its issues at `path`, each naming the part it is about.
 */
export function parseRecurrenceRule(
    value: unknown,
    path = "",
): ValidationResult<RecurrenceRule> {
    const issues: ValidationIssue[] = [];
    const issue = (message: string) => issues.push({ path, message });
    if (typeof value !== "string" || value === "") {
        return {
            ok: false,
            issues: [{ path, message: "expected an RRULE (FREQ=…;…)" }],
        };
    }
    const seen = new Map<string, string>();
    for (const part of value.split(";")) {
        const equals = part.indexOf("=");
        const name = (equals < 0 ? part : part.slice(0, equals)).toUpperCase();
        if (equals < 0 || name === "" || equals === part.length - 1) {
            issue(
                part === ""
                    ? "has an empty part (parts are NAME=VALUE, joined by ;)"
                    : `"${part}" is not a NAME=VALUE part`,
            );
            continue;
        }
        if (UNSUPPORTED.has(name)) {
            issue(`${name} is not supported (the rule subset is ${SUBSET})`);
            continue;
        }
        if (seen.has(name)) {
            issue(`${name} is given twice`);
            continue;
        }
        seen.set(name, part.slice(equals + 1).toUpperCase());
    }
    for (const name of seen.keys()) {
        if (!SUBSET.split(", ").includes(name)) {
            issue(
                `${name} is not an RRULE part (the rule subset is ${SUBSET})`,
            );
        }
    }

    const freqText = seen.get("FREQ");
    let freq: RecurrenceFrequency | undefined;
    if (freqText === undefined) issue("FREQ is required");
    else if (FREQUENCIES.has(freqText)) freq = freqText as RecurrenceFrequency;
    else if (FINER.has(freqText)) {
        issue(
            `FREQ=${freqText} is not supported (DAILY, WEEKLY, MONTHLY or YEARLY)`,
        );
    } else issue(`FREQ=${freqText} is not a frequency`);

    let interval = 1;
    const intervalText = seen.get("INTERVAL");
    if (intervalText !== undefined) {
        if (/^\d{1,6}$/.test(intervalText) && Number(intervalText) >= 1) {
            interval = Number(intervalText);
        } else issue(`INTERVAL=${intervalText} is not a positive integer`);
    }

    let count: number | undefined;
    const countText = seen.get("COUNT");
    if (countText !== undefined) {
        if (/^\d{1,6}$/.test(countText) && Number(countText) >= 1) {
            count = Number(countText);
        } else issue(`COUNT=${countText} is not a positive integer`);
    }

    let until: string | undefined;
    const untilText = seen.get("UNTIL");
    if (untilText !== undefined) {
        const parsed = untilOf(untilText);
        if (parsed === "floating") {
            issue(
                `UNTIL=${untilText} is a local time: write a date (YYYYMMDD) or a UTC date-time (YYYYMMDDTHHMMSSZ)`,
            );
        } else if (parsed === "") {
            issue(
                `UNTIL=${untilText} is not a date (YYYYMMDD) or a UTC date-time (YYYYMMDDTHHMMSSZ)`,
            );
        } else until = parsed;
    }
    if (countText !== undefined && untilText !== undefined) {
        issue("COUNT and UNTIL cannot both be given");
    }

    let byDay: RecurrenceWeekday[] | undefined;
    const byDayText = seen.get("BYDAY");
    if (byDayText !== undefined) {
        byDay = [];
        for (const item of byDayText.split(",")) {
            const match = BYDAY.exec(item);
            const weekday = match ? weekdayOfCode(match[2] ?? "") : undefined;
            const ordinal =
                match?.[1] === undefined ? undefined : Number(match[1]);
            if (
                !match ||
                weekday === undefined ||
                (ordinal !== undefined &&
                    (ordinal === 0 || Math.abs(ordinal) > 53))
            ) {
                issue(
                    `BYDAY=${byDayText}: "${item}" is not a weekday (MO, 2TU, -1FR)`,
                );
                byDay = undefined;
                break;
            }
            if (
                ordinal !== undefined &&
                freq !== undefined &&
                freq !== "MONTHLY" &&
                freq !== "YEARLY"
            ) {
                issue(
                    `BYDAY=${byDayText}: an ordinal ("${item}") is only for a MONTHLY or YEARLY rule`,
                );
                byDay = undefined;
                break;
            }
            byDay.push(
                ordinal === undefined ? { weekday } : { weekday, ordinal },
            );
        }
    }

    let byMonthDay: number[] | undefined;
    const byMonthDayText = seen.get("BYMONTHDAY");
    if (byMonthDayText !== undefined) {
        byMonthDay = integers(byMonthDayText, 31, false);
        if (!byMonthDay) {
            issue(
                `BYMONTHDAY=${byMonthDayText} is not a list of days (1…31, or -1…-31 from the end)`,
            );
        } else if (freq === "WEEKLY") {
            issue("BYMONTHDAY is not for a WEEKLY rule");
            byMonthDay = undefined;
        }
    }

    let byMonth: number[] | undefined;
    const byMonthText = seen.get("BYMONTH");
    if (byMonthText !== undefined) {
        byMonth = integers(byMonthText, 12, true);
        if (!byMonth)
            issue(`BYMONTH=${byMonthText} is not a list of months (1…12)`);
    }

    let weekStart: Weekday = 1;
    const weekStartText = seen.get("WKST");
    if (weekStartText !== undefined) {
        const weekday = weekdayOfCode(weekStartText);
        if (weekday === undefined)
            issue(`WKST=${weekStartText} is not a weekday (MO…SU)`);
        else weekStart = weekday;
    }

    if (issues.length > 0 || freq === undefined) return { ok: false, issues };
    return {
        ok: true,
        value: {
            freq,
            interval,
            ...(count === undefined ? {} : { count }),
            ...(until === undefined ? {} : { until }),
            ...(byDay === undefined ? {} : { byDay }),
            ...(byMonthDay === undefined ? {} : { byMonthDay }),
            ...(byMonth === undefined ? {} : { byMonth }),
            weekStart,
        },
    };
}
