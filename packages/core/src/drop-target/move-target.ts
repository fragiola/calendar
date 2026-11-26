// What a drop target means for a moved occurrence (D10, D14), from FullCalendar's tested drag
// behaviour (its `event-drag` tests as the reference, the code written fresh): between two days
// of a day grid, a delta of whole days (the wall clock kept, D4); between two times of the time
// grid, whole days plus the snapped minutes between them (an instant delta); from the all-day row
// into the time grid, a timed start at the slot; from the time grid onto the all-day row, an
// all-day start at the day. The model's command then applies its rules (durations, D10's defaults).
import type { MoveDelta } from "../commands/types";
import type { GridPoint } from "../engine/grid-point";
import { dayDelta } from "../engine/hit-test";
import { addDays } from "../time/add-days";
import { formatPlainDate } from "../time/format-plain-date";
import type { Instant } from "../time/instant";
import { parseDateTime } from "../time/parse-date-time";
import { parsePlainDate } from "../time/parse-plain-date";
import { addDaysInZone } from "../time-zone/add-days-in-zone";
import { formatInstant } from "../time-zone/format-instant";

/** A move's target, as `event.move` takes it (without the event's id). */
export type MoveRequest =
    | { readonly delta: MoveDelta }
    | { readonly start: string; readonly allDay: boolean };

/** Whether a request moves nothing (a drop where the drag started). */
export function isStill(request: MoveRequest): boolean {
    return (
        "delta" in request &&
        (request.delta.days ?? 0) === 0 &&
        (request.delta.minutes ?? 0) === 0
    );
}

/**
 * The minutes between two time points once `days` whole days are added to the first on the
 * display zone's wall clock: an instant delta, so a drag over a DST change lands where the pointer is.
 */
export function minutesBetweenPoints(
    origin: Extract<GridPoint, { kind: "time" }>,
    point: Extract<GridPoint, { kind: "time" }>,
    days: number,
    timeZone: string,
): number {
    const from = parseDateTime(origin.at);
    const to = parseDateTime(point.at);
    if (!from.ok || !to.ok) return point.minutes - origin.minutes;
    const shifted = addDaysInZone(from.value.instant, days, timeZone);
    return Math.round((to.value.instant - shifted) / 60_000);
}

/** The move from the point a drag started at to the point under the pointer. */
export function moveRequest(
    origin: GridPoint,
    point: GridPoint,
    timeZone: string,
): MoveRequest {
    const days = dayDelta(origin.date, point.date);
    if (origin.kind === "day" && point.kind === "day") {
        return { delta: days === 0 ? {} : { days } };
    }
    if (origin.kind === "time" && point.kind === "time") {
        const minutes = minutesBetweenPoints(origin, point, days, timeZone);
        return {
            delta: {
                ...(days === 0 ? {} : { days }),
                ...(minutes === 0 ? {} : { minutes }),
            },
        };
    }
    return point.kind === "time"
        ? { start: point.at, allDay: false }
        : { start: point.date, allDay: true };
}

/**
 * An edge (a date, or an RFC 3339 date-time) moved by whole days (the display zone's wall clock
 * for a date-time) and minutes (an instant delta), in the display zone; `undefined` when malformed.
 */
export function shiftedEdge(
    edge: string,
    allDay: boolean,
    days: number,
    minutes: number,
    timeZone: string,
): string | undefined {
    if (allDay) {
        const date = parsePlainDate(edge);
        return date.ok ? formatPlainDate(addDays(date.value, days)) : undefined;
    }
    const at = parseDateTime(edge);
    if (!at.ok) return undefined;
    const moved = (addDaysInZone(at.value.instant, days, timeZone) +
        minutes * 60_000) as Instant;
    return formatInstant(moved, timeZone);
}
