// An occurrence of a recurring event by its id (D15): `<eventId>@<original start>`, the original
// start in any offset (its instant is the key). The id is split at its last `@`, so an event id may
// hold one.
import type { CalendarEvent } from "../../document/calendar-event";
import type { FeatureState } from "../../features/types";
import type { Occurrence } from "../../layout/occurrence";
import { indexOf } from "../../state/draft";
import { resolveTimeZone } from "../../time-zone/resolve-time-zone";
import {
    keyOf,
    occurrenceOf,
    type Series,
    type SeriesStart,
    seriesOf,
    startAt,
} from "../expansion/series";

/** An occurrence found: its series, the rule's start it is, and the occurrence. */
export interface Located {
    readonly series: Series;
    readonly start: SeriesStart;
    readonly occurrence: Occurrence;
}

/** The display zone of a state, resolved. */
export function displayZoneOf(state: FeatureState): string {
    return resolveTimeZone(state.settings.timeZone);
}

function eventOf(state: FeatureState, id: string): CalendarEvent | undefined {
    const at = indexOf(state.events).get(id);
    return at === undefined ? undefined : state.events[at];
}

/**
 * The occurrence an id names: found, `null` when it is a recurring event's (or a recurring
 * event's own id) but names no occurrence of it, `undefined` when it is no recurring event's.
 */
export function locateOccurrence(
    state: FeatureState,
    occurrenceId: string,
): Located | null | undefined {
    const split = occurrenceId.lastIndexOf("@");
    if (split <= 0) {
        return eventOf(state, occurrenceId)?.recurrence ? null : undefined;
    }
    const event = eventOf(state, occurrenceId.slice(0, split));
    if (!event?.recurrence) {
        return eventOf(state, occurrenceId)?.recurrence ? null : undefined;
    }
    const series = seriesOf(event, displayZoneOf(state));
    if (!series) return null;
    const key = keyOf(occurrenceId.slice(split + 1), series.allDay);
    if (key === undefined || series.exdates.has(key)) return null;
    const start = startAt(series, key);
    return start
        ? { series, start, occurrence: occurrenceOf(series, start) }
        : null;
}
