// The edit scopes (D15) on the core's edit path (`commands/apply-edit.ts`): the core checks the
// event's permission and computes the edited occurrence with its own rules (D9, D10); this writes
// it. `this` writes an override (an excluded date for a removal); `following` ends the series
// just before the occurrence and adds a new series from it (one command, one event; the new id
// from `createId`); `all` changes the series (`shift-series.ts`). Without `occurrenceId`, an edit
// of a recurring event is an edit of the series (`all`, from its first start).
import { type Failure, fail, ok } from "../../commands/define";
import type { CommandResult } from "../../commands/types";
import type { RecurrenceJson } from "../../document/calendar-document";
import type { CalendarEvent } from "../../document/calendar-event";
import { toEvent } from "../../document/entities";
import type {
    EditRequest,
    EditWrite,
    FeatureState,
} from "../../features/types";
import type { Occurrence } from "../../layout/occurrence";
import type { Draft } from "../../state/draft";
import {
    keyOf,
    occurrenceOf,
    type Series,
    type SeriesStart,
    seriesOf,
    startOn,
} from "../expansion/series";
import { displayZoneOf, locateOccurrence } from "./locate-occurrence";
import { seriesBefore, shiftSeries } from "./shift-series";

/** The first start of a series: what an edit without `occurrenceId` starts from. */
function firstStart(series: Series): SeriesStart {
    return startOn(series, series.startDay, 0);
}

/** The occurrence an edit of a recurring event starts from, or why there is none. */
export function editTarget(
    state: FeatureState,
    edit: EditRequest,
): Occurrence | Failure | undefined {
    const { event } = edit;
    if (!event.recurrence) return undefined;
    const series = seriesOf(event, displayZoneOf(state));
    if (!series) return undefined;
    if (edit.occurrenceId === undefined) {
        if (edit.scope === "this" || edit.scope === "following") {
            return fail(
                "invalid_payload",
                `scope "${edit.scope}" edits one occurrence${edit.scope === "following" ? " and those after it" : ""}: name it with occurrenceId`,
                "/occurrenceId",
            );
        }
        return {
            occurrenceId: occurrenceOf(series, firstStart(series)).occurrenceId,
            eventId: event.id,
            start: event.start,
            end: event.end,
            allDay: event.allDay,
        };
    }
    if (edit.scope === undefined) {
        return fail(
            "invalid_payload",
            'an occurrence of a recurring event is edited with a scope: "this", "following" or "all"',
            "/scope",
        );
    }
    const located = locateOccurrence(state, edit.occurrenceId);
    if (!located || located.series.event !== event) {
        return fail(
            "not_found",
            `event "${event.id}" has no occurrence "${edit.occurrenceId}"`,
            "/occurrenceId",
        );
    }
    return located.occurrence;
}

/** The event with its recurrence replaced. */
function withRecurrence(
    event: CalendarEvent,
    recurrence: RecurrenceJson,
): CalendarEvent {
    return toEvent({ ...event, recurrence }, event.id);
}

/** The recurrence with one occurrence's override set (`null`: removed) and, maybe, it excluded. */
function overridden(
    series: Series,
    start: SeriesStart,
    fields: Readonly<Record<string, unknown>> | null,
    exclude: boolean,
): RecurrenceJson {
    const recurrence = series.event.recurrence as RecurrenceJson;
    const overrides: Record<string, Record<string, unknown>> = {};
    for (const [key, override] of series.overrides) {
        if (key === start.key) continue;
        const { key: text, ...own } = override;
        overrides[text] = own;
    }
    if (fields) overrides[start.start] = { ...fields };
    const exdates = [...(recurrence.exdates ?? [])];
    if (exclude && !series.exdates.has(start.key)) exdates.push(start.start);
    return {
        rule: recurrence.rule,
        ...(exdates.length > 0 ? { exdates } : {}),
        ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
    };
}

/** `this` on a change: the occurrence's own fields as an override (none when it is the rule's again). */
function writeThis(
    draft: Draft,
    series: Series,
    start: SeriesStart,
    next: CalendarEvent,
): CommandResult<unknown> {
    const { event } = series;
    if (
        next.timeZone !== event.timeZone ||
        next.calendarId !== event.calendarId
    ) {
        return fail(
            "refused",
            `an occurrence keeps its series' ${next.timeZone !== event.timeZone ? "timeZone" : "calendarId"}: change it with scope "following" or "all"`,
            next.timeZone !== event.timeZone ? "/timeZone" : "/calendarId",
        );
    }
    const fields: Record<string, unknown> = {};
    if (next.title !== event.title) fields.title = next.title;
    const moved =
        next.allDay !== series.allDay ||
        keyOf(next.start, next.allDay) !== start.key ||
        keyOf(next.end, next.allDay) !== keyOf(start.end, series.allDay);
    if (moved) {
        fields.start = next.start;
        fields.end = next.end;
        if (next.allDay !== series.allDay) fields.allDay = next.allDay;
    }
    draft.putEvent(
        withRecurrence(
            event,
            overridden(
                series,
                start,
                Object.keys(fields).length > 0 ? fields : null,
                false,
            ),
        ),
    );
    return ok({});
}

/** Writes an edit of a recurring event in its scope; `undefined` for an event that is not one. */
export function writeEdit(
    draft: Draft,
    edit: EditWrite,
): CommandResult<unknown> | undefined {
    const { event } = edit;
    if (!event.recurrence) return undefined;
    const displayZone = displayZoneOf(draft.state);
    const series = seriesOf(event, displayZone);
    if (!series) return undefined;
    const located =
        edit.occurrenceId === undefined
            ? undefined
            : locateOccurrence(draft.state, edit.occurrenceId);
    const start = located?.start ?? firstStart(series);
    let scope = edit.occurrenceId === undefined ? "all" : (edit.scope ?? "all");
    if (scope === "following" && start.index === 0) scope = "all";

    if (edit.next === null) {
        if (scope === "this") {
            draft.putEvent(
                withRecurrence(event, overridden(series, start, null, true)),
            );
        } else if (scope === "following") {
            draft.putEvent(seriesBefore(series, start));
        } else {
            draft.removeEvents((candidate) => candidate.id === event.id);
        }
        return ok({});
    }
    if (scope === "this") return writeThis(draft, series, start, edit.next);
    if (scope === "all") {
        const shifted = shiftSeries(
            series,
            edit.occurrence,
            edit.next,
            displayZone,
        );
        if ("ok" in shifted) return shifted;
        draft.putEvent(shifted);
        return ok({});
    }
    const id = draft.newId("event");
    const following = shiftSeries(
        series,
        edit.occurrence,
        edit.next,
        displayZone,
        {
            start,
            id,
        },
    );
    if ("ok" in following) return following;
    draft.putEvent(seriesBefore(series, start));
    draft.putEvent(following);
    return ok({ eventId: id });
}
