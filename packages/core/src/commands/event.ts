// The event commands (D8): add, update, move, resize, remove, set-data, set-flags. Their rules
// live here (D9, D10, `apply-edit.ts`), so `model.can` / `check` answer the same as `run`.
import type { CalendarEvent } from "../document/calendar-event";
import { EVENT_SCHEMA } from "../document/calendar-schema";
import type { CalendarSettings } from "../document/calendar-settings";
import { toEvent } from "../document/entities";
import { eventIssues } from "../document/event-issues";
import { requiresFeature } from "../features/keys";
import {
    DATA,
    DATE_OR_DATE_TIME,
    EVENT_FIELDS,
    ID,
    TIME_ZONE,
} from "../schema/fragments";
import { jsonIssues } from "../schema/validator";
import { fromEpochDay, toEpochDay } from "../time/epoch-day";
import { formatPlainDate } from "../time/format-plain-date";
import type { Instant } from "../time/instant";
import { parseDateTime } from "../time/parse-date-time";
import { parsePlainDate } from "../time/parse-plain-date";
import { formatInstant } from "../time-zone/format-instant";
import {
    LOCAL_TIME_ZONE,
    resolveTimeZone,
} from "../time-zone/resolve-time-zone";
import { validateTimeZone } from "../time-zone/validate-time-zone";
import { applyEdit, moveContextOf } from "./apply-edit";
import { defineCommand, fail, invalid, ok } from "./define";
import { isWritable, movedBy, movedTo, resizedTo } from "./event-moves";

/** `occurrenceId` and `scope`: an edit of one occurrence of a recurring event (D15). */
const OCCURRENCE_FIELDS = {
    occurrenceId: {
        type: "string",
        minLength: 1,
        description:
            "the occurrence edited, `<eventId>@<original start>` (requires recurrence())",
    },
    scope: {
        enum: ["this", "following", "all"],
        description:
            "which occurrences of a recurring event change (requires recurrence())",
    },
} as const;

/**
 * The end of an event added without one: `defaultAllDayDuration` days or `defaultTimedDuration`
 * minutes after its start (its start itself when it does not parse: the rules refuse it then;
 * none past the years a date-time can be written in).
 */
function defaultEnd(
    event: {
        readonly start: string;
        readonly allDay: boolean;
        readonly timeZone?: string;
    },
    settings: CalendarSettings,
): string | undefined {
    if (event.allDay) {
        const date = parsePlainDate(event.start);
        return date.ok
            ? formatPlainDate(
                  fromEpochDay(
                      toEpochDay(date.value) + settings.defaultAllDayDuration,
                  ),
              )
            : event.start;
    }
    const start = parseDateTime(event.start);
    if (!start.ok) return event.start;
    const end = start.value.instant + settings.defaultTimedDuration * 60_000;
    // a home zone the rules will refuse prints the end in the display zone (the same instant), so
    // the refusal names `/timeZone` instead of `Intl` throwing out of the command
    const zone =
        event.timeZone !== undefined &&
        event.timeZone !== LOCAL_TIME_ZONE &&
        validateTimeZone(event.timeZone).ok
            ? event.timeZone
            : resolveTimeZone(settings.timeZone);
    return isWritable(end) ? formatInstant(end as Instant, zone) : undefined;
}

/** A permission flag of `event.set-flags`: a value, or `null` to remove the event's own. */
const FLAG = { anyOf: [{ type: "boolean" }, { type: "null" }] } as const;

/** Where an event is after a move or a resize. */
function timesResult(eventId: string, next: CalendarEvent | null) {
    return {
        eventId,
        start: next?.start ?? "",
        end: next?.end ?? "",
        allDay: next?.allDay ?? false,
    };
}

const EVENT_ID = { eventId: { ...ID, description: "the event" } } as const;

const EVENT_ID_RESULT = {
    type: "object",
    properties: { eventId: ID },
    required: ["eventId"],
    additionalProperties: false,
} as const;

const TIMES_RESULT = {
    type: "object",
    properties: {
        eventId: ID,
        start: DATE_OR_DATE_TIME,
        end: DATE_OR_DATE_TIME,
        allDay: { type: "boolean" },
    },
    required: ["eventId", "start", "end", "allDay"],
    additionalProperties: false,
} as const;

export const eventAdd = defineCommand({
    name: "event.add",
    description:
        "Add an event. An all-day event takes YYYY-MM-DD dates, a timed one RFC 3339 date-times with their offset; `end` is exclusive and, when left out, `defaultAllDayDuration` days or `defaultTimedDuration` minutes after `start`. An `id` left out is generated.",
    payloadSchema: {
        type: "object",
        properties: { id: ID, ...EVENT_FIELDS },
        required: ["title", "start", "allDay"],
        additionalProperties: false,
    },
    resultSchema: EVENT_ID_RESULT,
    transient: false,
    reduce: (payload, { draft, features }) => {
        for (const key of Object.keys(payload)) {
            const owner = features.missing("eventFields", key);
            if (owner !== undefined) {
                return fail(
                    "invalid_payload",
                    `"${key}" ${requiresFeature(owner)}`,
                    `/${key}`,
                );
            }
        }
        if (payload.id !== undefined && draft.event(payload.id)) {
            return fail(
                "invalid_payload",
                `"${payload.id}" is the id of another event`,
                "/id",
            );
        }
        if (
            payload.calendarId !== undefined &&
            !draft.calendar(payload.calendarId)
        ) {
            return fail(
                "not_found",
                `no calendar has the id "${payload.calendarId}"`,
                "/calendarId",
            );
        }
        const end = payload.end ?? defaultEnd(payload, draft.state.settings);
        if (end === undefined) {
            return fail(
                "invalid_payload",
                "the default end would leave the years 0000–9999 a date-time can be written in",
                "/start",
            );
        }
        const fields = { ...payload, end };
        const failed = invalid(
            eventIssues(
                fields as Readonly<Record<string, unknown>> & typeof fields,
                "",
                features,
            ),
        );
        if (failed) return failed;
        const event = toEvent(fields, payload.id ?? draft.newId("event"));
        const refusal = features.checkEvent(draft.state, {
            command: "event.add",
            before: undefined,
            after: event,
        });
        if (refusal) return refusal;
        draft.putEvent(event);
        return ok({ eventId: event.id });
    },
});

export const eventUpdate = defineCommand({
    name: "event.update",
    description:
        "Change an event's fields: its title, its times (`start` and `end` in the form of its `allDay` after the change), its home `timeZone` or its `calendarId` (`null` removes either). Needs the event to be editable.",
    payloadSchema: {
        type: "object",
        properties: {
            ...EVENT_ID,
            title: { type: "string" },
            start: DATE_OR_DATE_TIME,
            end: DATE_OR_DATE_TIME,
            allDay: { type: "boolean" },
            timeZone: { anyOf: [TIME_ZONE, { type: "null" }] },
            calendarId: { anyOf: [ID, { type: "null" }] },
            ...OCCURRENCE_FIELDS,
        },
        required: ["eventId"],
        additionalProperties: false,
    },
    resultSchema: EVENT_ID_RESULT,
    transient: false,
    reduce: (payload, context) => {
        const { calendarId } = payload;
        if (
            typeof calendarId === "string" &&
            !context.draft.calendar(calendarId)
        ) {
            return fail(
                "not_found",
                `no calendar has the id "${calendarId}"`,
                "/calendarId",
            );
        }
        return applyEdit(
            "event.update",
            payload,
            "editable",
            context,
            (occurrence) => {
                const changed: Record<string, unknown> = {
                    start: occurrence.start,
                    end: occurrence.end,
                    allDay: occurrence.allDay,
                };
                for (const key of [
                    "title",
                    "start",
                    "end",
                    "allDay",
                    "timeZone",
                    "calendarId",
                ] as const) {
                    if (payload[key] !== undefined) {
                        changed[key] = payload[key] ?? undefined;
                    }
                }
                return changed;
            },
            () => ({ eventId: payload.eventId }),
        );
    },
});

export const eventMove = defineCommand({
    name: "event.move",
    description:
        "Move an event keeping its duration: to a new `start` (a date onto the all-day row, a date-time into the time grid; `allDay` says which, default the event's; between the two it takes the default duration unless `allDayMaintainDuration`), or by a `delta` (whole `days` keep the wall clock in the event's zone across DST, `minutes` are exact; minutes make an all-day event timed). Needs its start to be editable.",
    payloadSchema: {
        anyOf: [
            {
                type: "object",
                properties: {
                    ...EVENT_ID,
                    start: DATE_OR_DATE_TIME,
                    allDay: { type: "boolean" },
                    ...OCCURRENCE_FIELDS,
                },
                required: ["eventId", "start"],
                additionalProperties: false,
            },
            {
                type: "object",
                properties: {
                    ...EVENT_ID,
                    delta: {
                        type: "object",
                        properties: {
                            days: {
                                type: "integer",
                                minimum: -3_660_000,
                                maximum: 3_660_000,
                            },
                            minutes: {
                                type: "integer",
                                minimum: -5_270_400_000,
                                maximum: 5_270_400_000,
                            },
                        },
                        additionalProperties: false,
                    },
                    ...OCCURRENCE_FIELDS,
                },
                required: ["eventId", "delta"],
                additionalProperties: false,
            },
        ],
    },
    resultSchema: TIMES_RESULT,
    transient: false,
    reduce: (payload, context) =>
        applyEdit(
            "event.move",
            payload,
            "startEditable",
            context,
            (occurrence, event) => {
                const move = moveContextOf(context, event);
                return "delta" in payload
                    ? movedBy(occurrence, payload.delta, move)
                    : movedTo(
                          occurrence,
                          payload.start,
                          payload.allDay ?? occurrence.allDay,
                          move,
                      );
            },
            (next) => timesResult(payload.eventId, next),
        ),
});

export const eventResize = defineCommand({
    name: "event.resize",
    description:
        "Move one edge of an event: its `end` (exclusive; needs its duration to be editable) or its `start` (needs its start to be editable), `to` a date (all-day) or a date-time (timed). An end not after the start is refused.",
    payloadSchema: {
        type: "object",
        properties: {
            ...EVENT_ID,
            edge: { enum: ["start", "end"] },
            to: DATE_OR_DATE_TIME,
            ...OCCURRENCE_FIELDS,
        },
        required: ["eventId", "edge", "to"],
        additionalProperties: false,
    },
    resultSchema: TIMES_RESULT,
    transient: false,
    reduce: (payload, context) =>
        applyEdit(
            "event.resize",
            payload,
            payload.edge === "start" ? "startEditable" : "durationEditable",
            context,
            (occurrence, event) =>
                resizedTo(
                    occurrence,
                    payload.edge,
                    payload.to,
                    moveContextOf(context, event),
                ),
            (next) => timesResult(payload.eventId, next),
        ),
});

export const eventRemove = defineCommand({
    name: "event.remove",
    description: "Remove an event. Needs it to be deletable.",
    payloadSchema: {
        type: "object",
        properties: { ...EVENT_ID, ...OCCURRENCE_FIELDS },
        required: ["eventId"],
        additionalProperties: false,
    },
    resultSchema: EVENT_ID_RESULT,
    transient: false,
    reduce: (payload, context) =>
        applyEdit(
            "event.remove",
            payload,
            "deletable",
            context,
            () => null,
            () => ({ eventId: payload.eventId }),
        ),
});

export const eventSetData = defineCommand({
    name: "event.set-data",
    description:
        "Replace an event's data (the app's, any JSON) and, with `kind`, the kind that types it. Leaving `data` out removes it.",
    payloadSchema: {
        type: "object",
        properties: {
            ...EVENT_ID,
            kind: { type: "string", minLength: 1 },
            data: DATA,
        },
        required: ["eventId"],
        additionalProperties: false,
    },
    resultSchema: EVENT_ID_RESULT,
    transient: false,
    reduce: (payload, { draft }) => {
        const event = draft.event(payload.eventId);
        if (!event) {
            return fail(
                "not_found",
                `no event has the id "${payload.eventId}"`,
                "/eventId",
            );
        }
        const failed = invalid(jsonIssues(payload.data, "/data"));
        if (failed) return failed;
        draft.putEvent(
            toEvent(
                {
                    ...event,
                    kind: payload.kind ?? event.kind,
                    data: payload.data,
                },
                event.id,
            ),
        );
        return ok({ eventId: event.id });
    },
});

export const eventSetFlags = defineCommand({
    name: "event.set-flags",
    description:
        "Set an event's permission flags (`editable`, `startEditable`, `durationEditable`, `deletable`); `null` removes the event's own, so its calendar's or the settings' applies.",
    payloadSchema: {
        type: "object",
        properties: {
            ...EVENT_ID,
            editable: FLAG,
            startEditable: FLAG,
            durationEditable: FLAG,
            deletable: FLAG,
        },
        required: ["eventId"],
        additionalProperties: false,
    },
    resultSchema: EVENT_ID_RESULT,
    transient: false,
    reduce: (payload, { draft }) => {
        const event = draft.event(payload.eventId);
        if (!event) {
            return fail(
                "not_found",
                `no event has the id "${payload.eventId}"`,
                "/eventId",
            );
        }
        const flags: Record<string, unknown> = {};
        for (const key of [
            "editable",
            "startEditable",
            "durationEditable",
            "deletable",
        ] as const) {
            if (payload[key] !== undefined)
                flags[key] = payload[key] ?? undefined;
        }
        draft.putEvent(toEvent({ ...event, ...flags }, event.id));
        return ok({ eventId: event.id });
    },
});

export const eventSetAll = defineCommand({
    name: "event.set-all",
    description:
        "Replace every event with `events` (an app's controlled list: give each its `id`). An event object the calendar already holds is kept as it is; the others are validated like the document's. The edit flags and the constraints, which guard the user's edits, do not apply.",
    payloadSchema: {
        type: "object",
        properties: { events: { type: "array", items: EVENT_SCHEMA } },
        required: ["events"],
        additionalProperties: false,
    },
    resultSchema: {
        type: "object",
        properties: {
            eventIds: { type: "array", items: ID },
            removedEventIds: { type: "array", items: ID },
        },
        required: ["eventIds", "removedEventIds"],
        additionalProperties: false,
    },
    transient: false,
    reduce: (payload, { draft, features }) => {
        const ids = new Set<string>();
        const events: CalendarEvent[] = [];
        for (const [i, json] of payload.events.entries()) {
            const at = `/events/${i}`;
            if (json.id === undefined) {
                return fail(
                    "invalid_payload",
                    "give every event of the list its id",
                    `${at}/id`,
                );
            }
            if (ids.has(json.id)) {
                return fail(
                    "invalid_payload",
                    `"${json.id}" is the id of another event of the list`,
                    `${at}/id`,
                );
            }
            ids.add(json.id);
            const held = draft.event(json.id);
            if (held !== undefined && (held as unknown) === json) {
                events.push(held);
                continue;
            }
            for (const key of Object.keys(json)) {
                const owner = features.missing("eventFields", key);
                if (owner !== undefined) {
                    return fail(
                        "invalid_payload",
                        `"${key}" ${requiresFeature(owner)}`,
                        `${at}/${key}`,
                    );
                }
            }
            if (
                json.calendarId !== undefined &&
                !draft.calendar(json.calendarId)
            ) {
                return fail(
                    "not_found",
                    `no calendar has the id "${json.calendarId}"`,
                    `${at}/calendarId`,
                );
            }
            const failed = invalid(
                eventIssues(
                    json as Readonly<Record<string, unknown>> & typeof json,
                    at,
                    features,
                ),
            );
            if (failed) return failed;
            events.push(
                toEvent(
                    json as unknown as Readonly<Record<string, unknown>>,
                    json.id,
                ),
            );
        }
        const removedEventIds = draft.state.events
            .filter((event) => !ids.has(event.id))
            .map((event) => event.id);
        const same =
            events.length === draft.state.events.length &&
            events.every((event, i) => event === draft.state.events[i]);
        if (!same) draft.set({ events: Object.freeze(events) });
        return ok({ eventIds: [...ids], removedEventIds });
    },
});
