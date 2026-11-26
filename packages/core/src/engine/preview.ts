// A drag's preview in the layout's shape (D14): the times a target would give an occurrence, laid
// out alone by the core's own layouts (the same day-grid segments and time-grid fractions an
// adapter already renders), on the view of the current state. The preview is engine view state:
// nothing is committed while it shows.
import type { CalendarEvent } from "../document/calendar-event";
import { NO_FEATURES } from "../features/registry";
import { dayGrid, type Segment } from "../layout/day-grid";
import { layoutInput } from "../layout/layout-input";
import { PartCache } from "../layout/reuse";
import { type TimeSegment, timeGrid } from "../layout/time-grid";
import type { CalendarState } from "../state/calendar-state";

/** The times a drag would give an occurrence (an event added: no `eventId` yet). */
export interface PreviewTimes {
    readonly eventId: string | null;
    readonly occurrenceId: string | null;
    /** a date when `allDay`, an RFC 3339 date-time otherwise */
    readonly start: string;
    readonly end: string;
    readonly allDay: boolean;
}

/** A preview's segments, in the layout's shape: day-grid rows and time-grid columns. */
export interface PreviewSegments {
    /** per day-grid row (its `id`, the row's first day) the segments it shows */
    readonly weeks: readonly {
        readonly weekId: string;
        readonly segments: readonly Segment[];
    }[];
    /** per time-grid column (its date) the segments it shows */
    readonly columns: readonly {
        readonly date: string;
        readonly segments: readonly TimeSegment[];
    }[];
}

/** What a drag shows (`engine.get("drag-preview")`, `get("resize-preview")`). */
export interface DragPreview extends PreviewTimes, PreviewSegments {
    /** a move, a resize, or an event dropped from outside (`externalDrop()`) */
    readonly kind: "move" | "resize" | "external";
    /** a keyboard grab's (D13), not a pointer's */
    readonly keyboard: boolean;
}

const PREVIEW_ID = "~preview";

/** The segments `times` would have in the current view, laid out alone. */
export function previewSegments(
    state: CalendarState,
    today: number,
    times: PreviewTimes,
    event: CalendarEvent | undefined,
): PreviewSegments {
    const id = times.eventId ?? PREVIEW_ID;
    const alone: CalendarEvent = Object.freeze({
        id,
        title: event?.title ?? "",
        data: event?.data,
        ...(event?.timeZone === undefined ? {} : { timeZone: event.timeZone }),
        start: times.start,
        end: times.end,
        allDay: times.allDay,
    });
    const input = layoutInput(
        { ...state, events: [alone], calendars: [] },
        NO_FEATURES,
        today,
    );
    const occurrenceId = times.occurrenceId ?? id;
    const relabel = <S extends { occurrenceId: string; eventId: string }>(
        segment: S,
    ): S => ({
        ...segment,
        occurrenceId,
        eventId: times.eventId ?? "",
    });
    const weeks = (dayGrid(input, new PartCache())?.weeks ?? [])
        .filter((week) => week.segments.length > 0)
        .map((week) =>
            Object.freeze({
                weekId: week.id,
                segments: Object.freeze(week.segments.map(relabel)),
            }),
        );
    const columns = (timeGrid(input, new PartCache())?.columns ?? [])
        .filter((column) => column.segments.length > 0)
        .map((column) =>
            Object.freeze({
                date: column.date,
                segments: Object.freeze(column.segments.map(relabel)),
            }),
        );
    return { weeks: Object.freeze(weeks), columns: Object.freeze(columns) };
}
