// The one path every edit of an existing event takes (`event.update`, `event.move`,
// `event.resize`, `event.remove`): the event, its permission (D9), the occurrence it starts from
// (a feature's, `recurrence()`'s, else the event's own: D15's contribution point), the event as
// the edit leaves it, its rules, the features' constraints, then the write (a feature's own way,
// else the core's). `can` and `check` run the same path as a dry run.
import type { CalendarEvent } from "../document/calendar-event";
import { toEvent } from "../document/entities";
import { eventIssues } from "../document/event-issues";
import type { EditRequest } from "../features/types";
import { eventOccurrences, type Occurrence } from "../layout/occurrence";
import { resolveTimeZone } from "../time-zone/resolve-time-zone";
import { type Failure, fail, invalid, ok, type ReduceContext } from "./define";
import { type Permission, refusedEdit } from "./edit-rules";
import type { MoveContext } from "./event-moves";
import type { CommandResult, EditScope } from "./types";

/** An edit's request: which event, which of its occurrences. */
export interface EditPayload {
    readonly eventId: string;
    readonly occurrenceId?: string;
    readonly scope?: EditScope;
}

/** The context of a move: the settings, and the event's zone. */
export function moveContextOf(
    context: ReduceContext,
    event: CalendarEvent,
): MoveContext {
    const { settings } = context.draft.state;
    return {
        settings,
        timeZone: event.timeZone ?? resolveTimeZone(settings.timeZone),
    };
}

/**
 * Runs an edit: `change` gives the edited occurrence's fields from the occurrence (`null`: removed)
 * or why not; the result is `value` once written.
 */
export function applyEdit<R>(
    command: EditRequest["command"],
    payload: EditPayload,
    permission: Permission,
    context: ReduceContext,
    change: (
        occurrence: Occurrence,
        event: CalendarEvent,
    ) => object | null | Failure,
    value: (next: CalendarEvent | null) => R,
): CommandResult<R> {
    const { draft, features } = context;
    const event = draft.event(payload.eventId);
    if (!event) {
        return fail(
            "not_found",
            `no event has the id "${payload.eventId}"`,
            "/eventId",
        );
    }
    const calendar =
        event.calendarId === undefined
            ? undefined
            : draft.calendar(event.calendarId);
    const refused = refusedEdit(
        permission,
        event,
        calendar,
        draft.state.settings,
    );
    if (refused) return refused;
    const request: EditRequest = {
        command,
        event,
        occurrenceId: payload.occurrenceId,
        scope: payload.scope,
    };
    const target = features.editTarget(draft.state, request);
    if (target !== undefined && "ok" in target) return target;
    if (
        target === undefined &&
        payload.occurrenceId !== undefined &&
        payload.occurrenceId !== event.id
    ) {
        return fail(
            "not_found",
            `event "${event.id}" has no occurrence "${payload.occurrenceId}"`,
            "/occurrenceId",
        );
    }
    const occurrence = target ?? (eventOccurrences(event)[0] as Occurrence);
    const changed = change(occurrence, event);
    if (changed !== null && "ok" in changed) return changed as Failure;
    let next: CalendarEvent | null = null;
    if (changed !== null) {
        // an occurrence a feature took is checked as an event of its own: the series' fields (its
        // rule) are the feature's to check when it writes
        next = toEvent(
            target === undefined
                ? { ...event, ...changed }
                : {
                      ...event,
                      recurrence: undefined,
                      ...(occurrence.title === undefined
                          ? {}
                          : { title: occurrence.title }),
                      ...changed,
                  },
            event.id,
        );
        const issues = eventIssues(
            next as unknown as Readonly<Record<string, unknown>> &
                CalendarEvent,
            "",
            features,
        );
        const failed = invalid(issues);
        if (failed) return failed;
    }
    const refusal = features.checkEvent(draft.state, {
        command,
        before: event,
        after: next,
        occurrence,
    });
    if (refusal) return refusal;
    const written = features.writeEdit(draft, { ...request, occurrence, next });
    if (written !== undefined) {
        if (!written.ok) return written;
        const extra = written.value;
        return ok(
            typeof extra === "object" && extra !== null
                ? ({ ...value(next), ...extra } as R)
                : value(next),
        );
    }
    if (next === null)
        draft.removeEvents((candidate) => candidate.id === event.id);
    else draft.putEvent(next);
    return ok(value(next));
}
