// The event sources' commands: the app reports a range it is fetching (`set-loading`), merges
// what it received (`receive`: that source's events in that range replaced atomically, one
// event), and forgets what it fetched so it is asked again (`invalidate`). No network code: the
// app fetches. Received events are the source's truth: the edit flags and the constraints, which
// guard the user's edits, do not apply to them.
import { defineCommand, fail, invalid, ok } from "../../commands/define";
import type { CalendarEvent } from "../../document/calendar-event";
import { EVENT_SCHEMA } from "../../document/calendar-schema";
import { toEvent } from "../../document/entities";
import { eventIssues } from "../../document/event-issues";
import { eventTimes } from "../../document/event-times";
import { ID, PLAIN_DATE } from "../../schema/fragments";
import type { Draft } from "../../state/draft";
import { fromEpochDay } from "../../time/epoch-day";
import { resolveTimeZone } from "../../time-zone/resolve-time-zone";
import { startOfDay } from "../../time-zone/start-of-day";
import {
    type DayRange,
    daysOf,
    daysOfAll,
    rangeJson,
    withoutRange,
    withRange,
} from "../ranges/day-ranges";
import {
    type SourceState,
    sourceOf,
    sourceStateOf,
    sourcesOf,
} from "../state/source-state";

const DAYS = {
    type: "object",
    properties: {
        start: PLAIN_DATE,
        end: { ...PLAIN_DATE, description: "a date, YYYY-MM-DD (exclusive)" },
    },
    required: ["start", "end"],
    additionalProperties: false,
} as const;

const SOURCE_ID = { ...ID, description: "the event source" } as const;

/** Writes a source's ranges into the state slice. */
function setState(
    draft: Draft,
    sourceId: string,
    change: (
        fetched: DayRange[],
        loading: DayRange[],
    ) => [DayRange[], DayRange[]],
): void {
    const current = sourceStateOf(draft.state, sourceId);
    const [fetched, loading] = change(
        daysOfAll(current.fetched),
        daysOfAll(current.loading),
    );
    const next: SourceState = Object.freeze({
        fetched: Object.freeze(fetched.map(rangeJson)),
        loading: Object.freeze(loading.map(rangeJson)),
    });
    draft.set({
        eventSourceStates: Object.freeze({
            ...(draft.state.eventSourceStates as object | undefined),
            [sourceId]: next,
        }),
    });
}

/** The failure of a source id no source has, or of a range that is none. */
function unknownSource(draft: Draft, sourceId: string) {
    return sourceOf(draft.state, sourceId)
        ? undefined
        : fail(
              "not_found",
              `no event source has the id "${sourceId}"`,
              "/sourceId",
          );
}

function badRange(path: string) {
    return fail(
        "invalid_payload",
        "must be a range of days with its end after its start",
        path,
    );
}

/** Whether an event's own times touch a range of days of the display zone. */
function touches(event: CalendarEvent, range: DayRange, zone: string): boolean {
    const times = eventTimes(event);
    if (!times) return false;
    if (times.allDay) return times.start < range.end && times.end > range.start;
    const from = startOfDay(fromEpochDay(range.start), zone);
    const to = startOfDay(fromEpochDay(range.end), zone);
    return (
        times.start < to &&
        (times.end > from || (times.end === times.start && times.start >= from))
    );
}

export const eventSourcesReceive = defineCommand({
    name: "event-sources.receive",
    description:
        "Merge the events a source returned for a range of days (YYYY-MM-DD, end exclusive): the source's events touching the range (or with a received id) are replaced by `events`, atomically, and the range is marked fetched (and no longer loading). Events without a `calendarId` take the source's; their `sourceId` is the source.",
    payloadSchema: {
        type: "object",
        properties: {
            sourceId: SOURCE_ID,
            range: DAYS,
            events: { type: "array", items: EVENT_SCHEMA },
        },
        required: ["sourceId", "range", "events"],
        additionalProperties: false,
    },
    resultSchema: {
        type: "object",
        properties: {
            sourceId: ID,
            eventIds: { type: "array", items: ID },
            removedEventIds: { type: "array", items: ID },
        },
        required: ["sourceId", "eventIds", "removedEventIds"],
        additionalProperties: false,
    },
    transient: false,
    reduce: (payload, { draft, features }) => {
        const unknown = unknownSource(draft, payload.sourceId);
        if (unknown) return unknown;
        const range = daysOf(payload.range);
        if (!range) return badRange("/range");
        const source = sourceOf(draft.state, payload.sourceId);
        const received: {
            fields: Readonly<Record<string, unknown>>;
            id?: string;
        }[] = [];
        const ids = new Set<string>();
        for (const [i, json] of payload.events.entries()) {
            const at = `/events/${i}`;
            if (
                json.sourceId !== undefined &&
                json.sourceId !== payload.sourceId
            ) {
                return fail(
                    "invalid_payload",
                    `is not "${payload.sourceId}", the source received`,
                    `${at}/sourceId`,
                );
            }
            const calendarId = json.calendarId ?? source?.calendarId;
            if (calendarId !== undefined && !draft.calendar(calendarId)) {
                return fail(
                    "not_found",
                    `no calendar has the id "${calendarId}"`,
                    `${at}/calendarId`,
                );
            }
            const fields = {
                ...json,
                sourceId: payload.sourceId,
                ...(calendarId === undefined ? {} : { calendarId }),
            };
            const failed = invalid(
                eventIssues(
                    fields as Readonly<Record<string, unknown>> & typeof fields,
                    at,
                    features,
                ),
            );
            if (failed) return failed;
            if (json.id !== undefined) {
                if (ids.has(json.id)) {
                    return fail(
                        "invalid_payload",
                        `"${json.id}" is the id of another received event`,
                        `${at}/id`,
                    );
                }
                const existing = draft.event(json.id);
                if (existing && existing.sourceId !== payload.sourceId) {
                    return fail(
                        "invalid_payload",
                        `"${json.id}" is the id of an event that is not this source's`,
                        `${at}/id`,
                    );
                }
                ids.add(json.id);
            }
            received.push(
                json.id === undefined ? { fields } : { fields, id: json.id },
            );
        }
        const zone = resolveTimeZone(draft.state.settings.timeZone);
        const removed = draft.removeEvents(
            (event) =>
                event.sourceId === payload.sourceId &&
                !ids.has(event.id) &&
                touches(event, range, zone),
        );
        const eventIds: string[] = [];
        for (const { fields, id } of received) {
            // a generated id is none of the received ones either
            const eventId =
                id ??
                draft.ids.next(
                    "event",
                    (candidate) =>
                        ids.has(candidate) ||
                        draft.event(candidate) !== undefined,
                );
            ids.add(eventId);
            draft.putEvent(toEvent(fields, eventId));
            eventIds.push(eventId);
        }
        setState(draft, payload.sourceId, (fetched, loading) => [
            withRange(fetched, range),
            withoutRange(loading, range),
        ]);
        return ok({
            sourceId: payload.sourceId,
            eventIds,
            removedEventIds: removed,
        });
    },
});

export const eventSourcesInvalidate = defineCommand({
    name: "event-sources.invalidate",
    description:
        "Forget what was fetched, so `ranges-to-fetch` asks for it again (a refetch): of one source or of every source, within a range of days or all of it. Events stay until the next `event-sources.receive` replaces them.",
    payloadSchema: {
        type: "object",
        properties: { sourceId: SOURCE_ID, range: DAYS },
        additionalProperties: false,
    },
    resultSchema: {
        type: "object",
        properties: { sourceIds: { type: "array", items: ID } },
        required: ["sourceIds"],
        additionalProperties: false,
    },
    transient: false,
    reduce: (payload, { draft }) => {
        if (payload.sourceId !== undefined) {
            const unknown = unknownSource(draft, payload.sourceId);
            if (unknown) return unknown;
        }
        const range =
            payload.range === undefined ? undefined : daysOf(payload.range);
        if (payload.range !== undefined && !range) return badRange("/range");
        const sourceIds =
            payload.sourceId === undefined
                ? sourcesOf(draft.state).map((source) => source.id)
                : [payload.sourceId];
        for (const sourceId of sourceIds) {
            setState(draft, sourceId, (fetched, loading) => [
                range ? withoutRange(fetched, range) : [],
                loading,
            ]);
        }
        return ok({ sourceIds });
    },
});

export const eventSourcesSetLoading = defineCommand({
    name: "event-sources.set-loading",
    description:
        "Mark a range of days of a source as being fetched (`loading: true`, so `ranges-to-fetch` leaves it out) or not any more (`loading: false`: the fetch failed or was cancelled).",
    payloadSchema: {
        type: "object",
        properties: {
            sourceId: SOURCE_ID,
            range: DAYS,
            loading: { type: "boolean" },
        },
        required: ["sourceId", "range", "loading"],
        additionalProperties: false,
    },
    resultSchema: {
        type: "object",
        properties: { sourceId: ID },
        required: ["sourceId"],
        additionalProperties: false,
    },
    transient: false,
    reduce: (payload, { draft }) => {
        const unknown = unknownSource(draft, payload.sourceId);
        if (unknown) return unknown;
        const range = daysOf(payload.range);
        if (!range) return badRange("/range");
        setState(draft, payload.sourceId, (fetched, loading) => [
            fetched,
            payload.loading
                ? withRange(loading, range)
                : withoutRange(loading, range),
        ]);
        return ok({ sourceId: payload.sourceId });
    },
});
