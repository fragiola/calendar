// The new times of a moved or resized occurrence (D4, D9, D10), from FullCalendar's tested
// behaviour (its `event-drag/timegrid` tests as the reference, the code written fresh):
// - a move to a new start keeps the duration: days for an all-day event, the instant duration for
//   a timed one;
// - a timed event moved onto the all-day row lasts `defaultAllDayDuration` days, an all-day event
//   moved into the time grid `defaultTimedDuration` minutes, unless `allDayMaintainDuration` (then
//   the days it covered, or as many days on the wall clock);
// - a delta of whole days keeps the wall clock in the event's zone (09:00 stays 09:00 across DST),
//   minutes are an instant delta; any minutes make an all-day event timed;
// - a resize moves one edge; an end not after the start is nonsense, refused.
// Timed results are written in the event's zone (its `timeZone`, else the display zone).
import type { CalendarSettings } from "../document/calendar-settings";
import {
    type EventTimes,
    eventTimes,
    type TimedFields,
} from "../document/event-times";
import { fromEpochDay, toEpochDay } from "../time/epoch-day";
import { formatPlainDate } from "../time/format-plain-date";
import type { Instant } from "../time/instant";
import { minutesOfDay } from "../time/minutes-of-day";
import { parseDateTime } from "../time/parse-date-time";
import { parsePlainDate } from "../time/parse-plain-date";
import { parsePlainTime } from "../time/parse-plain-time";
import { timedDayRange } from "../time/timed-day-range";
import { addDaysInZone } from "../time-zone/add-days-in-zone";
import { formatInstant } from "../time-zone/format-instant";
import { instantToWallClock } from "../time-zone/instant-to-wall-clock";
import { startOfDay } from "../time-zone/start-of-day";
import { type Failure, fail } from "./define";
import type { MoveDelta } from "./types";

/** An occurrence's new fields. */
export interface NewTimes {
    readonly start: string;
    readonly end: string;
    readonly allDay: boolean;
}

/** What a move or a resize reads besides the occurrence. */
export interface MoveContext {
    readonly settings: CalendarSettings;
    /** the event's zone: its `timeZone`, else the display zone, resolved */
    readonly timeZone: string;
}

const MINUTE = 60_000;

function allDayTimes(start: number, end: number): NewTimes {
    return {
        start: formatPlainDate(fromEpochDay(start)),
        end: formatPlainDate(fromEpochDay(end)),
        allDay: true,
    };
}

/** The instants a document can write in any zone: a day inside years 0000–9999 (RFC 3339). */
const FIRST = toEpochDay({ year: 0, month: 1, day: 2 }) * 86_400_000;
const LAST = toEpochDay({ year: 9999, month: 12, day: 31 }) * 86_400_000;

/** Whether an instant has an RFC 3339 form in every zone. */
export function isWritable(at: number): boolean {
    return at >= FIRST && at < LAST;
}

function timedTimes(
    start: Instant,
    end: Instant,
    timeZone: string,
): NewTimes | Failure {
    if (!isWritable(start) || !isWritable(end)) {
        return fail(
            "invalid_payload",
            "the event would leave the years 0000–9999 a date-time can be written in",
        );
    }
    return {
        start: formatInstant(start, timeZone),
        end: formatInstant(end, timeZone),
        allDay: false,
    };
}

/** The days a timed occurrence covers in a zone, `nextDayThreshold` applied (at least one). */
function daysCovered(
    times: Extract<EventTimes, { allDay: false }>,
    context: MoveContext,
): number {
    const threshold = parsePlainTime(context.settings.nextDayThreshold);
    const range = timedDayRange(
        instantToWallClock(times.start, context.timeZone),
        instantToWallClock(times.end, context.timeZone),
        threshold.ok ? minutesOfDay(threshold.value) : 0,
    );
    return toEpochDay(range.end) - toEpochDay(range.start);
}

/** The times of an occurrence of the state (always valid there). */
function timesOf(occurrence: TimedFields): EventTimes {
    const times = eventTimes(occurrence);
    if (!times)
        throw new TypeError("an occurrence of the state has invalid times");
    return times;
}

/** The end of an all-day event turned timed at `start`. */
function timedEnd(start: Instant, days: number, context: MoveContext): Instant {
    return context.settings.allDayMaintainDuration
        ? addDaysInZone(start, days, context.timeZone)
        : ((start + context.settings.defaultTimedDuration * MINUTE) as Instant);
}

/** An occurrence moved to start at `start` (`allDay`: onto the all-day row or into the time grid). */
export function movedTo(
    occurrence: TimedFields,
    start: string,
    allDay: boolean,
    context: MoveContext,
): NewTimes | Failure {
    const times = timesOf(occurrence);
    if (allDay) {
        const date = parsePlainDate(start, "/start");
        if (typeof start !== "string" || !date.ok) {
            return fail(
                "invalid_payload",
                `"${start}" is not a date as YYYY-MM-DD (a move onto the all-day row takes one)`,
                "/start",
            );
        }
        const day = toEpochDay(date.value);
        const days = times.allDay
            ? times.end - times.start
            : context.settings.allDayMaintainDuration
              ? daysCovered(times, context)
              : context.settings.defaultAllDayDuration;
        return allDayTimes(day, day + days);
    }
    const at = parseDateTime(start, "/start");
    if (!at.ok) {
        return fail(
            "invalid_payload",
            `"${start}" is not an RFC 3339 date-time with its offset (a move into the time grid takes one)`,
            "/start",
        );
    }
    const instant = at.value.instant;
    const end = times.allDay
        ? timedEnd(instant, times.end - times.start, context)
        : ((instant + (times.end - times.start)) as Instant);
    return timedTimes(instant, end, context.timeZone);
}

/** An occurrence moved by a delta: whole days on the wall clock, then minutes on the instant line. */
export function movedBy(
    occurrence: TimedFields,
    delta: MoveDelta,
    context: MoveContext,
): NewTimes | Failure {
    const times = timesOf(occurrence);
    const days = delta.days ?? 0;
    const minutes = delta.minutes ?? 0;
    if (times.allDay) {
        if (minutes === 0) {
            return allDayTimes(times.start + days, times.end + days);
        }
        const start = (startOfDay(
            fromEpochDay(times.start + days),
            context.timeZone,
        ) +
            minutes * MINUTE) as Instant;
        return timedTimes(
            start,
            timedEnd(start, times.end - times.start, context),
            context.timeZone,
        );
    }
    const start = (addDaysInZone(times.start, days, context.timeZone) +
        minutes * MINUTE) as Instant;
    return timedTimes(
        start,
        (start + (times.end - times.start)) as Instant,
        context.timeZone,
    );
}

/** An occurrence with one edge moved to `to`; an end not after the start is refused. */
export function resizedTo(
    occurrence: TimedFields,
    edge: "start" | "end",
    to: string,
    context: MoveContext,
): NewTimes | Failure {
    const times = timesOf(occurrence);
    if (times.allDay) {
        const date = parsePlainDate(to, "/to");
        if (!date.ok) {
            return fail(
                "invalid_payload",
                `"${to}" is not a date as YYYY-MM-DD (an all-day event's edges are dates)`,
                "/to",
            );
        }
        const day = toEpochDay(date.value);
        const start = edge === "start" ? day : times.start;
        const end = edge === "end" ? day : times.end;
        if (end <= start) {
            return fail(
                "invalid_payload",
                "the end must be after the start (an all-day end is exclusive)",
                "/to",
            );
        }
        return allDayTimes(start, end);
    }
    const at = parseDateTime(to, "/to");
    if (!at.ok) {
        return fail(
            "invalid_payload",
            `"${to}" is not an RFC 3339 date-time with its offset (a timed event's edges are date-times)`,
            "/to",
        );
    }
    const start = edge === "start" ? at.value.instant : times.start;
    const end = edge === "end" ? at.value.instant : times.end;
    if (end <= start) {
        return fail(
            "invalid_payload",
            "the end must be after the start",
            "/to",
        );
    }
    return timedTimes(start, end, context.timeZone);
}
