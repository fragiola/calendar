// An occurrence's part attributes (D17), from the state alone: its event, occurrence and calendar
// ids, `data-all-day`, a segment's `data-continues-before` / `-after` (the segment the adapter
// renders says), and what the installed features add.
import type { ComposedFeatures } from "../features/registry";
import type { FeatureState, PartAttributes } from "../features/types";
import type { LayoutInput } from "../layout/layout-input";
import { eventOccurrences, type Occurrence } from "../layout/occurrence";
import { indexOf } from "../state/draft";
import { flag } from "./day-attributes";

/** What `get("event-attributes-by")` takes. */
export interface EventAttributesPayload {
    occurrenceId: string;
    /** the rendered segment's: it started before the row or column */
    continuesBefore?: boolean;
    /** the rendered segment's: it ends after the row or column */
    continuesAfter?: boolean;
}

const byId = new WeakMap<LayoutInput, Map<string, Occurrence>>();

/** The occurrences the view shows, by id (made once per layout input: adapters ask per event). */
function shownById(input: LayoutInput): Map<string, Occurrence> {
    let map = byId.get(input);
    if (!map) {
        map = new Map(
            input.placed.map((placed) => [
                placed.occurrence.occurrenceId,
                placed.occurrence,
            ]),
        );
        byId.set(input, map);
    }
    return map;
}

/**
 * An occurrence by its id: one the view shows, else one a feature finds (`recurrence()`'s, any
 * date), else a non-recurring event's own.
 */
export function occurrenceOf(
    input: LayoutInput,
    features: ComposedFeatures,
    occurrenceId: string,
): Occurrence | undefined {
    const shown = shownById(input).get(occurrenceId);
    if (shown) return shown;
    const found = features.occurrenceById(
        input.state as FeatureState,
        occurrenceId,
    );
    if (found !== undefined) return found ?? undefined;
    const at = indexOf(input.state.events).get(occurrenceId);
    const event = at === undefined ? undefined : input.state.events[at];
    return event ? eventOccurrences(event)[0] : undefined;
}

/** The attributes of an occurrence's element, or `undefined` for no such occurrence. */
export function eventAttributes(
    input: LayoutInput,
    features: ComposedFeatures,
    payload: EventAttributesPayload,
): PartAttributes | undefined {
    const occurrence = occurrenceOf(input, features, payload.occurrenceId);
    if (!occurrence) return undefined;
    const at = indexOf(input.state.events).get(occurrence.eventId);
    const event = at === undefined ? undefined : input.state.events[at];
    const own: PartAttributes = {
        "data-event-id": occurrence.eventId,
        "data-occurrence-id": occurrence.occurrenceId,
        "data-calendar-id": event?.calendarId,
        "data-all-day": flag(occurrence.allDay),
        "data-continues-before": flag(payload.continuesBefore === true),
        "data-continues-after": flag(payload.continuesAfter === true),
    };
    const added = features.eventAttributes(
        input.state as FeatureState,
        occurrence,
    );
    return added ? { ...own, ...added } : own;
}
