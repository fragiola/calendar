// The calendar (category) commands (D8). A calendar's flags are defaults of its events' (D9); the
// calendar commands are the app's configuration, not edits of events, so no event flag refuses
// them, except removing a calendar with its events, which removes each event.
import { toCalendar, toEvent } from "../document/entities";
import { CALENDAR_FIELDS, ID } from "../schema/fragments";
import { jsonIssues } from "../schema/validator";
import { defineCommand, fail, invalid, ok } from "./define";
import { refusedEdit } from "./edit-rules";

const CALENDAR_ID = {
    calendarId: { ...ID, description: "the calendar" },
} as const;

const CALENDAR_ID_RESULT = {
    type: "object",
    properties: { calendarId: ID },
    required: ["calendarId"],
    additionalProperties: false,
} as const;

function notFound(calendarId: string) {
    return fail(
        "not_found",
        `no calendar has the id "${calendarId}"`,
        "/calendarId",
    );
}

export const calendarAdd = defineCommand({
    name: "calendar.add",
    description:
        "Add a calendar: a category of events (`calendarId` on an event), with its `title` (the app's), its `data`, whether its events are `editable` by default and whether they are `visible`. An `id` left out is generated.",
    payloadSchema: {
        type: "object",
        properties: { id: ID, ...CALENDAR_FIELDS },
        required: ["title"],
        additionalProperties: false,
    },
    resultSchema: CALENDAR_ID_RESULT,
    transient: false,
    reduce: (payload, { draft }) => {
        if (payload.id !== undefined && draft.calendar(payload.id)) {
            return fail(
                "invalid_payload",
                `"${payload.id}" is the id of another calendar`,
                "/id",
            );
        }
        const failed = invalid(jsonIssues(payload.data, "/data"));
        if (failed) return failed;
        const calendar = toCalendar(
            payload,
            payload.id ?? draft.newId("calendar"),
        );
        draft.putCalendar(calendar);
        return ok({ calendarId: calendar.id });
    },
});

export const calendarUpdate = defineCommand({
    name: "calendar.update",
    description:
        "Change a calendar's `title`, its `data`, or whether its events are `editable` by default (`null` removes it, so the settings' applies).",
    payloadSchema: {
        type: "object",
        properties: {
            ...CALENDAR_ID,
            title: { type: "string" },
            editable: { anyOf: [{ type: "boolean" }, { type: "null" }] },
            data: CALENDAR_FIELDS.data,
        },
        required: ["calendarId"],
        additionalProperties: false,
    },
    resultSchema: CALENDAR_ID_RESULT,
    transient: false,
    reduce: (payload, { draft }) => {
        const calendar = draft.calendar(payload.calendarId);
        if (!calendar) return notFound(payload.calendarId);
        const failed = invalid(jsonIssues(payload.data, "/data"));
        if (failed) return failed;
        const changed: Record<string, unknown> = { ...calendar };
        if (payload.title !== undefined) changed.title = payload.title;
        if (payload.editable !== undefined) {
            changed.editable = payload.editable ?? undefined;
        }
        if (payload.data !== undefined) changed.data = payload.data;
        draft.putCalendar(toCalendar(changed, calendar.id));
        return ok({ calendarId: calendar.id });
    },
});

export const calendarRemove = defineCommand({
    name: "calendar.remove",
    description:
        'Remove a calendar, and either its events (`events: "remove"`) or only their `calendarId` (`events: "keep"`).',
    payloadSchema: {
        type: "object",
        properties: { ...CALENDAR_ID, events: { enum: ["remove", "keep"] } },
        required: ["calendarId", "events"],
        additionalProperties: false,
    },
    resultSchema: {
        type: "object",
        properties: {
            calendarId: ID,
            removedEventIds: { type: "array", items: ID },
        },
        required: ["calendarId", "removedEventIds"],
        additionalProperties: false,
    },
    transient: false,
    reduce: (payload, { draft, features }) => {
        const { calendarId } = payload;
        const calendar = draft.calendar(calendarId);
        if (!calendar) return notFound(calendarId);
        let removedEventIds: string[] = [];
        if (payload.events === "remove") {
            // removing its events is removing each: their rules apply (D9), and the features'
            for (const event of draft.state.events) {
                if (event.calendarId !== calendarId) continue;
                const refusal =
                    refusedEdit(
                        "deletable",
                        event,
                        calendar,
                        draft.state.settings,
                    ) ??
                    features.checkEvent(draft.state, {
                        command: "calendar.remove",
                        before: event,
                        after: null,
                    });
                if (refusal) {
                    return fail(
                        "refused",
                        `${refusal.error.message}: keep the calendar's events (events: "keep") or change the rule first`,
                        "/events",
                    );
                }
            }
            removedEventIds = draft.removeEvents(
                (event) => event.calendarId === calendarId,
            );
        } else {
            for (const event of draft.state.events) {
                if (event.calendarId === calendarId) {
                    draft.putEvent(
                        toEvent({ ...event, calendarId: undefined }, event.id),
                    );
                }
            }
        }
        draft.removeCalendar(calendarId);
        return ok({ calendarId, removedEventIds });
    },
});

export const calendarSetVisible = defineCommand({
    name: "calendar.set-visible",
    description: "Show or hide a calendar's events in every view.",
    payloadSchema: {
        type: "object",
        properties: { ...CALENDAR_ID, visible: { type: "boolean" } },
        required: ["calendarId", "visible"],
        additionalProperties: false,
    },
    resultSchema: CALENDAR_ID_RESULT,
    transient: false,
    reduce: (payload, { draft }) => {
        const calendar = draft.calendar(payload.calendarId);
        if (!calendar) return notFound(payload.calendarId);
        draft.putCalendar(
            toCalendar({ ...calendar, visible: payload.visible }, calendar.id),
        );
        return ok({ calendarId: calendar.id });
    },
});
