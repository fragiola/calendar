// `@fragiola/calendar/recurrence`: the `recurrence()` feature (D15). Events with a `recurrence`
// (an RFC 5545 RRULE subset, excluded dates, overrides) show one occurrence per date of their rule,
// expanded only over the days asked for; every edit command takes `occurrenceId` and `scope`.
import type { CalendarDocument } from "../document/calendar-document";
import type { CalendarEvent } from "../document/calendar-event";
import { defineFeature } from "../features/define-feature";
import type { CalendarFeature } from "../features/types";
import { indexOf } from "../state/draft";
import { resolveTimeZone } from "../time-zone/resolve-time-zone";
import { validateTimeZone } from "../time-zone/validate-time-zone";
import { eventSetRecurrence } from "./commands/event-set-recurrence";
import { locateOccurrence } from "./edits/locate-occurrence";
import { editTarget, writeEdit } from "./edits/scoped-edit";
import { occurrencesIn } from "./expansion/occurrences-in";
import { seriesOf, windowOccurrences } from "./expansion/series";
import { recurrenceIssues, seriesIssues } from "./rules/recurrence-issues";

export type { EditScope, OccurrenceTarget } from "../commands/types";
export type { RecurrenceJson } from "../document/calendar-document";
export { formatRecurrenceRule } from "./rule/format-recurrence-rule";
export { parseRecurrenceRule } from "./rule/parse-recurrence-rule";
export type {
    RecurrenceFrequency,
    RecurrenceRule,
    RecurrenceWeekday,
} from "./rule/recurrence-rule";

/** The recurrence feature, as `createCalendarModel`'s `features` takes it. */
export type RecurrenceFeature = CalendarFeature<"recurrence">;

/**
 * Recurring events (D15): an event's `recurrence` repeats it by an RFC 5545 RRULE subset in its
 * zone (wall clock kept across DST), with excluded dates and overrides; occurrence ids are
 * `<eventId>@<original start>`; `event.update`, `event.move`, `event.resize` and `event.remove`
 * take `{ occurrenceId, scope: "this" | "following" | "all" }`.
 */
export function recurrence(): RecurrenceFeature {
    return defineFeature({
        name: "recurrence",
        commands: [eventSetRecurrence],
        get: {
            "occurrences-in": (
                state,
                payload: { range?: { start?: unknown; end?: unknown } },
            ) => occurrencesIn(state, payload.range),
        },
        is: {
            "event-recurring": (state, { eventId }: { eventId?: unknown }) => {
                const at =
                    typeof eventId === "string"
                        ? indexOf(state.events).get(eventId)
                        : undefined;
                return (
                    at !== undefined &&
                    state.events[at]?.recurrence !== undefined
                );
            },
        },
        eventIssues: recurrenceIssues,
        issues: (json, at) => {
            const doc = json as unknown as CalendarDocument;
            const zone = doc.settings?.timeZone ?? "local";
            if (!validateTimeZone(zone).ok) return [];
            const displayZone = resolveTimeZone(zone);
            return doc.events.flatMap((event, i) =>
                event.recurrence &&
                recurrenceIssues(event as never, "").length === 0
                    ? seriesIssues(
                          event as CalendarEvent,
                          at(`/events/${i}`),
                          displayZone,
                      )
                    : [],
            );
        },
        occurrences: (_state, event, within) => {
            if (!event.recurrence) return undefined;
            const series = seriesOf(event, within.timeZone);
            return series ? windowOccurrences(series, within) : undefined;
        },
        occurrenceById: (state, occurrenceId) => {
            const located = locateOccurrence(state, occurrenceId);
            return located === undefined
                ? undefined
                : (located?.occurrence ?? null);
        },
        editTarget,
        writeEdit,
    });
}
