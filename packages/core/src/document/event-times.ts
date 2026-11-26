// An event's (or an occurrence's) `start` and `end` read once: epoch days for an all-day one,
// instants for a timed one. The state keeps the strings the document wrote (a round trip is
// stable); the commands and the layout read them through here, cached per object.

import { toEpochDay } from "../time/epoch-day";
import type { Instant } from "../time/instant";
import { parseDateTime } from "../time/parse-date-time";
import { parsePlainDate } from "../time/parse-plain-date";
import type { ValidationIssue } from "./validation-issue";

/** What `start` and `end` mean: days (all-day, end exclusive) or instants (timed, end exclusive). */
export type EventTimes =
    | {
          readonly allDay: true;
          /** epoch day of the first day */
          readonly start: number;
          /** epoch day after the last day */
          readonly end: number;
      }
    | {
          readonly allDay: false;
          readonly start: Instant;
          readonly end: Instant;
      };

/** The fields `eventTimes` reads. */
export interface TimedFields {
    readonly start: string;
    readonly end: string;
    readonly allDay: boolean;
}

const cache = new WeakMap<TimedFields, EventTimes>();

/**
 * The times of fields whose `start`/`end` are valid for their `allDay` (an event of a loaded state,
 * an occurrence); `undefined` when they are not.
 */
export function eventTimes(fields: TimedFields): EventTimes | undefined {
    const cached = cache.get(fields);
    if (cached) return cached;
    const times = readTimes(fields, "", undefined);
    if (times && Object.isFrozen(fields)) cache.set(fields, times);
    return times;
}

/**
 * The times of `fields`, or `undefined` with the problems pushed to `issues` at `path`: a value of
 * the wrong form for `allDay`, an all-day end not after its start, a timed end before its start
 * (a timed event may last no time: a deadline; the layout gives it `eventMinDuration`).
 */
export function readTimes(
    fields: TimedFields,
    path: string,
    issues: ValidationIssue[] | undefined,
): EventTimes | undefined {
    if (fields.allDay) {
        const start = parsePlainDate(fields.start, `${path}/start`);
        const end = parsePlainDate(fields.end, `${path}/end`);
        if (!start.ok || !end.ok) {
            if (!start.ok) issues?.push(...allDayIssue(start.issues));
            if (!end.ok) issues?.push(...allDayIssue(end.issues));
            return undefined;
        }
        const times = {
            allDay: true as const,
            start: toEpochDay(start.value),
            end: toEpochDay(end.value),
        };
        if (times.end <= times.start) {
            issues?.push({
                path: `${path}/end`,
                message:
                    "must be after start (an all-day end is exclusive: a one-day event ends the next day)",
            });
            return undefined;
        }
        return times;
    }
    const start = parseDateTime(fields.start, `${path}/start`);
    const end = parseDateTime(fields.end, `${path}/end`);
    if (!start.ok || !end.ok) {
        if (!start.ok) issues?.push(...start.issues);
        if (!end.ok) issues?.push(...end.issues);
        return undefined;
    }
    if (end.value.instant < start.value.instant) {
        issues?.push({
            path: `${path}/end`,
            message: "must not be before start",
        });
        return undefined;
    }
    return {
        allDay: false,
        start: start.value.instant,
        end: end.value.instant,
    };
}

function allDayIssue(issues: readonly ValidationIssue[]): ValidationIssue[] {
    return issues.map((issue) => ({
        path: issue.path,
        message: `${issue.message} (an all-day event takes YYYY-MM-DD dates)`,
    }));
}
