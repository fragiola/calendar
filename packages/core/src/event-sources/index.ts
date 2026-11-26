// `@fragiola/calendar/event-sources`: the `eventSources()` feature, a state feature
// (`architecture/features.md`, "State features"): the sources the app fetches events from
// (`settings.eventSources`), what was fetched and what is loading per source, the ranges still to
// fetch for the visible range (`get("ranges-to-fetch")`), and `event-sources.receive` to merge a
// response atomically. No network code, and no in-memory derivation (`/local`): the fetch is the
// app's, and events already in memory need no source.

import { fail } from "../commands/define";
import type { CalendarDocument } from "../document/calendar-document";
import type { ValidationIssue } from "../document/validation-issue";
import { defineFeature } from "../features/define-feature";
import type { CalendarFeature } from "../features/types";
import type { EventSourceStatus } from "../state/feature-queries";
import {
    eventSourcesInvalidate,
    eventSourcesReceive,
    eventSourcesSetLoading,
} from "./commands/source-commands";
import { rangesToFetch } from "./ranges/ranges-to-fetch";
import {
    type EventSourcesSlice,
    sourceOf,
    sourceStateOf,
    sourcesOf,
} from "./state/source-state";

export type { EventSource } from "../document/calendar-document";
export type { EventSourceStatus, RangeToFetch } from "../state/feature-queries";
export type { EventSourcesSlice, SourceState } from "./state/source-state";

/** The event sources feature, as `createCalendarModel`'s `features` takes it. */
export type EventSourcesFeature = CalendarFeature<
    "event-sources",
    EventSourcesSlice
>;

/** Source ids used twice in the settings, at `path` (the settings'). */
function duplicateSources(
    sources: readonly { readonly id: string }[] | undefined,
    path: string,
): ValidationIssue[] {
    const seen = new Set<string>();
    const issues: ValidationIssue[] = [];
    sources?.forEach((source, i) => {
        if (seen.has(source.id)) {
            issues.push({
                path: `${path}/eventSources/${i}/id`,
                message: `"${source.id}" is the id of another event source`,
            });
        }
        seen.add(source.id);
    });
    return issues;
}

const statuses = new WeakMap<object, EventSourceStatus>();

/**
 * Event sources (a state feature): the app fetches each source's events for the ranges
 * `get("ranges-to-fetch")` lists, reports them loading (`event-sources.set-loading`) and merges
 * what it received (`event-sources.receive`); `event-sources.invalidate` asks again.
 */
export function eventSources(): EventSourcesFeature {
    return defineFeature<"event-sources", EventSourcesSlice>({
        name: "event-sources",
        commands: [
            eventSourcesReceive,
            eventSourcesInvalidate,
            eventSourcesSetLoading,
        ],
        get: {
            "ranges-to-fetch": (
                state,
                payload: { range?: { start?: unknown; end?: unknown } },
            ) => rangesToFetch(state, payload.range),
            "event-source-by": (state, { id }: { id?: unknown }) => {
                const source =
                    typeof id === "string" ? sourceOf(state, id) : undefined;
                if (!source) return undefined;
                const known = sourceStateOf(state, source.id);
                // the same object while the source and its ranges are
                const last = statuses.get(source);
                if (
                    last?.fetched === known.fetched &&
                    last.loading === known.loading
                ) {
                    return last;
                }
                const status: EventSourceStatus = Object.freeze({
                    ...source,
                    ...known,
                });
                statuses.set(source, status);
                return status;
            },
        },
        is: {
            "event-source-loading": (
                state,
                { sourceId }: { sourceId?: unknown },
            ) =>
                typeof sourceId === "string"
                    ? sourceStateOf(state, sourceId).loading.length > 0
                    : sourcesOf(state).some(
                          (source) =>
                              sourceStateOf(state, source.id).loading.length >
                              0,
                      ),
        },
        settingsIssues: (settings, path) =>
            duplicateSources(
                settings.eventSources as
                    | readonly { readonly id: string }[]
                    | undefined,
                path,
            ),
        issues: (json, at) => {
            const doc = json as unknown as CalendarDocument;
            const sources = new Set(
                (doc.settings?.eventSources ?? []).map((source) => source.id),
            );
            const calendars = new Set(
                (doc.calendars ?? []).map((calendar) => calendar.id),
            );
            const issues: ValidationIssue[] = [];
            (doc.settings?.eventSources ?? []).forEach((source, i) => {
                if (
                    source.calendarId !== undefined &&
                    !calendars.has(source.calendarId)
                ) {
                    issues.push({
                        path: at(`/settings/eventSources/${i}/calendarId`),
                        message: `no calendar has the id "${source.calendarId}"`,
                    });
                }
            });
            doc.events.forEach((event, i) => {
                if (
                    event.sourceId !== undefined &&
                    !sources.has(event.sourceId)
                ) {
                    issues.push({
                        path: at(`/events/${i}/sourceId`),
                        message: `no event source has the id "${event.sourceId}"`,
                    });
                }
            });
            return issues;
        },
        load: () => ({ eventSourceStates: Object.freeze({}) }),
        checkEvent: (state, change) =>
            change.after?.sourceId !== undefined &&
            change.after.sourceId !== change.before?.sourceId &&
            !sourceOf(state, change.after.sourceId)
                ? fail(
                      "not_found",
                      `no event source has the id "${change.after.sourceId}"`,
                      "/sourceId",
                  )
                : undefined,
        stateChanged: (draft, before) => {
            const sources = draft.state.settings.eventSources;
            if (sources === before.settings.eventSources) return;
            // a source removed takes its events and what was fetched with it
            const ids = new Set((sources ?? []).map((source) => source.id));
            draft.removeEvents(
                (event) =>
                    event.sourceId !== undefined && !ids.has(event.sourceId),
            );
            const states = draft.state
                .eventSourceStates as EventSourcesSlice["eventSourceStates"];
            const kept = Object.fromEntries(
                Object.entries(states ?? {}).filter(([id]) => ids.has(id)),
            );
            if (Object.keys(kept).length !== Object.keys(states ?? {}).length) {
                draft.set({ eventSourceStates: Object.freeze(kept) });
            }
        },
    });
}
