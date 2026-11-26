// A rule written back as an RRULE value (RFC 5545 §3.3.10), its parts in one order: what the edit
// scopes write when they end a series or move one (`following`, `all`).
import type { RecurrenceRule } from "./recurrence-rule";
import { WEEKDAY_CODES } from "./weekday-codes";

/** The RRULE value of a rule (`FREQ=WEEKLY;BYDAY=MO,WE`): INTERVAL and WKST only when not the default. */
export function formatRecurrenceRule(rule: RecurrenceRule): string {
    const parts = [`FREQ=${rule.freq}`];
    if (rule.interval !== 1) parts.push(`INTERVAL=${rule.interval}`);
    if (rule.count !== undefined) parts.push(`COUNT=${rule.count}`);
    if (rule.until !== undefined) {
        parts.push(`UNTIL=${rule.until.replace(/[-:]/g, "")}`);
    }
    if (rule.byMonth) parts.push(`BYMONTH=${rule.byMonth.join(",")}`);
    if (rule.byMonthDay) parts.push(`BYMONTHDAY=${rule.byMonthDay.join(",")}`);
    if (rule.byDay) {
        parts.push(
            `BYDAY=${rule.byDay
                .map(
                    (day) =>
                        `${day.ordinal ?? ""}${WEEKDAY_CODES[day.weekday]}`,
                )
                .join(",")}`,
        );
    }
    if (rule.weekStart !== 1)
        parts.push(`WKST=${WEEKDAY_CODES[rule.weekStart]}`);
    return parts.join(";");
}
