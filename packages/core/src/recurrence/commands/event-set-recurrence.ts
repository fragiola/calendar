// `event.set-recurrence`: the command that makes an event recurring, changes its rule, excluded
// dates and overrides, or makes it a single event again. The other edits reach a series through
// the core's commands and their scopes (`edits/scoped-edit.ts`).
import { defineCommand, fail, invalid, ok } from "../../commands/define";
import { refusedEdit } from "../../commands/edit-rules";
import { toEvent } from "../../document/entities";
import { eventIssues } from "../../document/event-issues";
import { ID, RECURRENCE } from "../../schema/fragments";
import { displayZoneOf } from "../edits/locate-occurrence";
import { seriesIssues } from "../rules/recurrence-issues";

export const eventSetRecurrence = defineCommand({
    name: "event.set-recurrence",
    description:
        "Make an event recurring, change its recurrence, or (`null`) make it a single event again. `rule` is an RFC 5545 RRULE of the subset FREQ (DAILY, WEEKLY, MONTHLY, YEARLY), INTERVAL, COUNT, UNTIL, BYDAY (2TU, -1FR in monthly and yearly rules), BYMONTHDAY, BYMONTH, WKST, expanded from the event's start at its wall-clock time in its zone; `exdates` are the original starts left out; `overrides` change one occurrence's `title`, or its `start` and `end` (and `allDay`), by its original start. Needs the event to be editable.",
    payloadSchema: {
        type: "object",
        properties: {
            eventId: { ...ID, description: "the event" },
            recurrence: { anyOf: [RECURRENCE, { type: "null" }] },
        },
        required: ["eventId", "recurrence"],
        additionalProperties: false,
    },
    resultSchema: {
        type: "object",
        properties: { eventId: ID },
        required: ["eventId"],
        additionalProperties: false,
    },
    transient: false,
    reduce: (payload, { draft, features }) => {
        const event = draft.event(payload.eventId);
        if (!event) {
            return fail(
                "not_found",
                `no event has the id "${payload.eventId}"`,
                "/eventId",
            );
        }
        const refused = refusedEdit(
            "editable",
            event,
            event.calendarId === undefined
                ? undefined
                : draft.calendar(event.calendarId),
            draft.state.settings,
        );
        if (refused) return refused;
        const next = toEvent(
            { ...event, recurrence: payload.recurrence ?? undefined },
            event.id,
        );
        const issues = eventIssues(
            next as unknown as Readonly<Record<string, unknown>> & typeof next,
            "",
            features,
        );
        const failed = invalid(
            issues.length > 0
                ? issues
                : seriesIssues(next, "", displayZoneOf(draft.state)),
        );
        if (failed) return failed;
        const refusal = features.checkEvent(draft.state, {
            command: "event.set-recurrence",
            before: event,
            after: next,
        });
        if (refusal) return refusal;
        draft.putEvent(next);
        return ok({ eventId: event.id });
    },
});
