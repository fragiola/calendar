// The constraints' rules (FullCalendar's tested behaviour as the reference, written fresh): an
// event added, moved or resized must lie whole within the business hours or within one of the
// allowed ranges (`eventConstraint`); an all-day one within business days (each day it covers has
// business hours); `overlap: false` (or `false` for a calendar) refuses an occurrence overlapping
// another event's (either event's calendar refusing is enough). A change that keeps an occurrence's
// times and calendar (a rename) is not checked, nor a removal. A refusal is `refused`, its message
// naming the setting that refused.
import { type Failure, fail } from "../../commands/define";
import type { CalendarEvent } from "../../document/calendar-event";
import type { CalendarSettings } from "../../document/calendar-settings";
import type {
    EventChange,
    FeatureReads,
    FeatureState,
    SelectionRange,
} from "../../features/types";
import type { Occurrence } from "../../layout/occurrence";
import { indexOf } from "../../state/draft";
import { fromEpochDay, toEpochDay } from "../../time/epoch-day";
import { formatPlainDate } from "../../time/format-plain-date";
import { parsePlainDate } from "../../time/parse-plain-date";
import { resolveTimeZone } from "../../time-zone/resolve-time-zone";
import {
    businessSpansAround,
    businessSpansOn,
    constraintSpans,
    contains,
    dayOf,
    type Span,
    spanOf,
} from "../ranges/spans";

/** Why a span of times breaks a constraint setting (`eventConstraint`, `selectConstraint`), if it does. */
function breaks(
    settings: CalendarSettings,
    setting: "eventConstraint" | "selectConstraint",
    fields: {
        readonly start: string;
        readonly end: string;
        readonly allDay: boolean;
    },
    zone: string,
): string | undefined {
    const constraint = settings[setting];
    if (constraint === undefined) return undefined;
    const span = spanOf(fields, zone);
    if (!span) return undefined;
    if (constraint !== "business-hours") {
        return contains(constraintSpans(constraint, zone), span)
            ? undefined
            : `outside the ranges ${setting} allows`;
    }
    const rules = settings.businessHours ?? [];
    if (fields.allDay) {
        const first = parsePlainDate(fields.start);
        const last = parsePlainDate(fields.end);
        if (!first.ok || !last.ok) return undefined;
        for (
            let day = toEpochDay(first.value);
            day < toEpochDay(last.value);
            day++
        ) {
            if (businessSpansOn(rules, day, zone).length === 0) {
                return `on ${formatPlainDate(fromEpochDay(day))}, a day without business hours (${setting})`;
            }
        }
        return undefined;
    }
    return contains(businessSpansAround(rules, span, zone), span)
        ? undefined
        : `outside the business hours (${setting})`;
}

/** Whether events of a calendar may overlap others. */
function mayOverlap(
    overlap: CalendarSettings["overlap"],
    calendarId: string | undefined,
): boolean {
    if (overlap === undefined || overlap === true) return true;
    if (overlap === false) return false;
    return calendarId === undefined ? true : (overlap[calendarId] ?? true);
}

/** How far a recurring event's occurrences are checked from its start: a year of days. */
const HORIZON_DAYS = 366;

/** The first other event's occurrence a span overlaps where the overlap setting forbids it. */
function overlapped(
    state: FeatureState,
    after: CalendarEvent,
    span: Span,
    others: readonly Occurrence[],
    zone: string,
): string | undefined {
    const { overlap } = state.settings;
    const mine = mayOverlap(overlap, after.calendarId);
    const index = indexOf(state.events);
    for (const occurrence of others) {
        if (occurrence.eventId === after.id) continue;
        const other = spanOf(occurrence, zone);
        if (!other || other.start >= span.end || span.start >= other.end)
            continue;
        const at = index.get(occurrence.eventId);
        const event = at === undefined ? undefined : state.events[at];
        if (!mine || !mayOverlap(overlap, event?.calendarId)) {
            return `overlaps event "${occurrence.eventId}" (the overlap setting)`;
        }
    }
    return undefined;
}

/**
 * The refusal of an event change by the constraints, or `undefined`. A recurring event added or
 * given a new rule has each of its occurrences checked over a year from its start; an edit of one
 * occurrence (any scope) checks that occurrence's new times.
 */
export function checkConstraints(
    state: FeatureState,
    change: EventChange,
    reads: FeatureReads,
): Failure | undefined {
    const { after } = change;
    if (after === null) return undefined;
    const before = change.occurrence ?? change.before;
    if (
        before &&
        before.start === after.start &&
        before.end === after.end &&
        before.allDay === after.allDay &&
        change.before?.calendarId === after.calendarId &&
        change.before?.recurrence === after.recurrence
    ) {
        return undefined;
    }
    const { settings } = state;
    const zone = resolveTimeZone(settings.timeZone);
    const first = spanOf(after, zone);
    if (!first) return undefined;
    const from = dayOf(first.start, zone) - 1;
    const to =
        after.recurrence === undefined
            ? dayOf(first.end, zone) + 2
            : from + HORIZON_DAYS;
    const within = {
        range: { start: fromEpochDay(from), end: fromEpochDay(to) },
        timeZone: zone,
    };
    const own =
        after.recurrence === undefined
            ? [after]
            : reads.eventOccurrences(after, within).filter((occurrence) => {
                  const span = spanOf(occurrence, zone);
                  return span !== undefined && dayOf(span.start, zone) < to;
              });
    const checkOverlap =
        settings.overlap !== undefined && settings.overlap !== true;
    const others = checkOverlap ? reads.occurrences(within) : [];
    for (const occurrence of own) {
        const reason = breaks(settings, "eventConstraint", occurrence, zone);
        if (reason)
            return fail("refused", `event "${after.id}" would be ${reason}`);
        const span = spanOf(occurrence, zone);
        const overlap =
            span &&
            checkOverlap &&
            overlapped(state, after, span, others, zone);
        if (overlap) return fail("refused", `event "${after.id}" ${overlap}`);
    }
    return undefined;
}

/** The refusal of a selected range by `selectConstraint`, or `undefined`. */
export function checkSelection(
    state: FeatureState,
    selection: SelectionRange,
): Failure | undefined {
    const zone = resolveTimeZone(state.settings.timeZone);
    const reason = breaks(state.settings, "selectConstraint", selection, zone);
    return reason
        ? fail("refused", `the selection would be ${reason}`)
        : undefined;
}
