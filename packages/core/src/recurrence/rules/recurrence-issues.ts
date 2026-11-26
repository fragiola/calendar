// An event's `recurrence` past its JSON Schema (D15): a rule of the subset, an all-day event's
// UNTIL a date, excluded dates and override keys written as original starts in the event's form,
// overrides that change only an occurrence's own fields (`title`, and its times as a pair). That an
// override's key is an occurrence of the rule needs the event's zone: `seriesIssues`.
import type { RecurrenceJson } from "../../document/calendar-document";
import type { CalendarEvent } from "../../document/calendar-event";
import { readTimes } from "../../document/event-times";
import type { ValidationIssue } from "../../document/validation-issue";
import { validateTimeZone } from "../../time-zone/validate-time-zone";
import { keyOf, seriesOf, startAt } from "../expansion/series";
import { parseRecurrenceRule } from "../rule/parse-recurrence-rule";

/** The fields an override may change. */
const OVERRIDE_FIELDS = new Set(["title", "start", "end", "allDay"]);

/** A JSON pointer token (RFC 6901): `~` and `/` escaped. */
export function pointerToken(key: string): string {
    return key.replaceAll("~", "~0").replaceAll("/", "~1");
}

function form(allDay: boolean): string {
    return allDay
        ? "a date (YYYY-MM-DD)"
        : "an RFC 3339 date-time with its offset";
}

/** The problems of an event's `recurrence` (it matched the schema), the event at `path`. */
export function recurrenceIssues(
    event: Readonly<Record<string, unknown>>,
    path: string,
): ValidationIssue[] {
    const recurrence = event.recurrence as RecurrenceJson | undefined;
    if (recurrence === undefined) return [];
    const at = `${path}/recurrence`;
    const allDay = event.allDay === true;
    const issues: ValidationIssue[] = [];
    const rule = parseRecurrenceRule(recurrence.rule, `${at}/rule`);
    if (!rule.ok) issues.push(...rule.issues);
    else if (allDay && rule.value.until?.includes("T")) {
        issues.push({
            path: `${at}/rule`,
            message: "UNTIL of an all-day event is a date (YYYYMMDD)",
        });
    }
    const excluded = new Set<number>();
    (recurrence.exdates ?? []).forEach((text, i) => {
        const key = keyOf(text, allDay);
        if (key === undefined) {
            issues.push({
                path: `${at}/exdates/${i}`,
                message: `is not ${form(allDay)}: an excluded date is an occurrence's original start`,
            });
        } else excluded.add(key);
    });
    for (const [text, fields] of Object.entries(recurrence.overrides ?? {})) {
        const here = `${at}/overrides/${pointerToken(text)}`;
        const key = keyOf(text, allDay);
        if (key === undefined) {
            issues.push({
                path: here,
                message: `is not ${form(allDay)}: an override is keyed by an occurrence's original start`,
            });
            continue;
        }
        if (excluded.has(key)) {
            issues.push({
                path: here,
                message: "is an excluded date (exdates)",
            });
        }
        for (const [field, value] of Object.entries(fields)) {
            const fieldPath = `${here}/${pointerToken(field)}`;
            if (!OVERRIDE_FIELDS.has(field)) {
                issues.push({
                    path: fieldPath,
                    message:
                        "is not a field an occurrence overrides (title, start, end, allDay)",
                });
            } else if (
                field === "allDay"
                    ? typeof value !== "boolean"
                    : typeof value !== "string"
            ) {
                issues.push({
                    path: fieldPath,
                    message:
                        field === "allDay"
                            ? "must be a boolean"
                            : "must be a string",
                });
            }
        }
        const { start, end } = fields;
        if (
            start !== undefined ||
            end !== undefined ||
            fields.allDay !== undefined
        ) {
            if (typeof start !== "string" || typeof end !== "string") {
                issues.push({
                    path: here,
                    message:
                        "an override that moves an occurrence gives its start and its end",
                });
            } else {
                readTimes(
                    {
                        start,
                        end,
                        allDay:
                            typeof fields.allDay === "boolean"
                                ? fields.allDay
                                : allDay,
                    },
                    here,
                    issues,
                );
            }
        }
    }
    return issues;
}

/** The overrides of a valid event whose key is no occurrence of its rule, in `displayZone`. */
export function seriesIssues(
    event: CalendarEvent,
    path: string,
    displayZone: string,
): ValidationIssue[] {
    const zone = event.timeZone ?? displayZone;
    if (!event.recurrence?.overrides || !validateTimeZone(zone).ok) return [];
    const series = seriesOf(event, displayZone);
    if (!series) return [];
    const issues: ValidationIssue[] = [];
    for (const [at, override] of series.overrides) {
        if (!startAt(series, at)) {
            issues.push({
                path: `${path}/recurrence/overrides/${pointerToken(override.key)}`,
                message:
                    "is not an occurrence of the rule (an override is keyed by an original start)",
            });
        }
    }
    return issues;
}
