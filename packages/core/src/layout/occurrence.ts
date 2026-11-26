// An occurrence (D6): what a view shows of an event. A non-recurring event has one, whose id is the
// event's; a recurring one (`recurrence()`, D15) has one per date of its rule, each with the id
// `<eventId>@<original start>`. The layout reads occurrences only through `occurrencesOf`, the
// contribution point features fill, so it never imports a feature.
import type { CalendarEvent } from "../document/calendar-event";
import type { DateRange } from "../time/date-range";

/** One occurrence of an event: its own times, in the event's document form. */
export interface Occurrence {
    readonly occurrenceId: string;
    readonly eventId: string;
    /** a date when `allDay`, an RFC 3339 date-time otherwise */
    readonly start: string;
    /** exclusive, as the event's */
    readonly end: string;
    readonly allDay: boolean;
    /** its own title, when an occurrence of a recurring event was renamed alone (`recurrence()`) */
    readonly title?: string;
}

/** The days the occurrences are asked for, and the display zone they are shown in. */
export interface OccurrenceWindow {
    /** the days shown (exclusive end), in the display zone */
    readonly range: DateRange;
    /** the display zone, resolved (never `"local"`) */
    readonly timeZone: string;
}

/**
 * A feature's say in an event's occurrences over a window: its occurrences (any that may touch
 * the window: the layout keeps those that do), or `undefined` to leave the event to the core (one
 * occurrence, the event itself).
 */
export type ContributeOccurrences = (
    event: CalendarEvent,
    within: OccurrenceWindow,
) => readonly Occurrence[] | undefined;

const single = new WeakMap<CalendarEvent, readonly Occurrence[]>();

/** An event's own occurrence: its id and its times (the same object while the event is). */
export function eventOccurrences(event: CalendarEvent): readonly Occurrence[] {
    let occurrences = single.get(event);
    if (!occurrences) {
        occurrences = Object.freeze([
            Object.freeze({
                occurrenceId: event.id,
                eventId: event.id,
                start: event.start,
                end: event.end,
                allDay: event.allDay,
            }),
        ]);
        single.set(event, occurrences);
    }
    return occurrences;
}

/**
 * The occurrences of `events` over a window, in event order: each feature's contribution, else the
 * event's own. The one function the layout and the queries read occurrences from.
 */
export function occurrencesOf(
    events: readonly CalendarEvent[],
    within: OccurrenceWindow,
    contribute: ContributeOccurrences | undefined,
): Occurrence[] {
    const all: Occurrence[] = [];
    for (const event of events) {
        const occurrences =
            contribute?.(event, within) ?? eventOccurrences(event);
        for (const occurrence of occurrences) all.push(occurrence);
    }
    return all;
}
