// The settings' rules past their JSON Schema: a zone and a locale the engine knows, times of day
// that parse and keep their order, a valid range that is one, an `eventOrder` it can read, and at
// least one day of the week shown. Nonsense is refused, never repaired (D9).
import { parseEventOrder } from "../layout/event-order";
import { validateLocale } from "../locale/validate-locale";
import { comparePlainDates } from "../time/compare-plain-dates";
import { minutesOfDay } from "../time/minutes-of-day";
import { parsePlainDate } from "../time/parse-plain-date";
import { parsePlainTime } from "../time/parse-plain-time";
import { validateTimeZone } from "../time-zone/validate-time-zone";
import type { CalendarSettingsJson } from "./calendar-document";
import type { ValidationIssue } from "./validation-issue";

/** The minutes of an `HH:mm` value, or `undefined` with its issue pushed. */
function minutesAt(
    value: string,
    path: string,
    issues: ValidationIssue[],
): number | undefined {
    const time = parsePlainTime(value, path);
    if (!time.ok) {
        issues.push(...time.issues);
        return undefined;
    }
    return minutesOfDay(time.value);
}

/** The problems of settings that matched their schema (a whole set, or a `settings.set` patch applied). */
export function settingsIssues(
    settings: Readonly<CalendarSettingsJson>,
    path: string,
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (settings.timeZone !== undefined) {
        const zone = validateTimeZone(settings.timeZone, `${path}/timeZone`);
        if (!zone.ok) issues.push(...zone.issues);
    }
    if (settings.locale !== undefined) {
        const locale = validateLocale(settings.locale, `${path}/locale`);
        if (!locale.ok) issues.push(...locale.issues);
    }
    const min =
        settings.slotMinTime === undefined
            ? 0
            : minutesAt(settings.slotMinTime, `${path}/slotMinTime`, issues);
    const max =
        settings.slotMaxTime === undefined
            ? 1440
            : minutesAt(settings.slotMaxTime, `${path}/slotMaxTime`, issues);
    if (min !== undefined && max !== undefined && min >= max) {
        issues.push({
            path: `${path}/${settings.slotMaxTime === undefined ? "slotMinTime" : "slotMaxTime"}`,
            message: "slotMaxTime must be after slotMinTime",
        });
    }
    if (settings.nextDayThreshold !== undefined) {
        const at = `${path}/nextDayThreshold`;
        const threshold = minutesAt(settings.nextDayThreshold, at, issues);
        if (threshold === 1440) {
            issues.push({ path: at, message: "must be before 24:00" });
        }
    }
    const range = settings.validRange;
    if (range !== undefined) {
        const start =
            range.start === undefined
                ? undefined
                : parsePlainDate(range.start, `${path}/validRange/start`);
        const end =
            range.end === undefined
                ? undefined
                : parsePlainDate(range.end, `${path}/validRange/end`);
        if (start && !start.ok) issues.push(...start.issues);
        if (end && !end.ok) issues.push(...end.issues);
        if (
            start?.ok &&
            end?.ok &&
            comparePlainDates(start.value, end.value) >= 0
        ) {
            issues.push({
                path: `${path}/validRange/end`,
                message: "must be after start (the end is exclusive)",
            });
        }
    }
    if (settings.hiddenDays !== undefined && settings.hiddenDays.length >= 7) {
        issues.push({
            path: `${path}/hiddenDays`,
            message: "cannot hide every day of the week",
        });
    }
    if (settings.eventOrder !== undefined) {
        const order = parseEventOrder(settings.eventOrder);
        if (typeof order === "string") {
            issues.push({ path: `${path}/eventOrder`, message: order });
        }
    }
    return issues;
}
