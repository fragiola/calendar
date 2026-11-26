// Focus positions read from the model alone (D12): the cells a view shows, the cell an occurrence
// starts in, whether a position is shown, the grid's tab stop when nothing is focused, and the
// position a registered element is. The engine reads them with its focus on top; a render without
// an engine (a server's, the first client render: `partAttributes`) reads them as they are, so
// both give the same tab stop.
import type { DayGrid } from "../layout/day-grid";
import type { Occurrence } from "../layout/occurrence";
import type { TimeGrid } from "../layout/time-grid";
import type { CalendarModel } from "../model/calendar-model";
import { fromEpochDay } from "../time/epoch-day";
import { formatPlainDate } from "../time/format-plain-date";
import { minutesOfDay } from "../time/minutes-of-day";
import { parseDateTime } from "../time/parse-date-time";
import { parsePlainTime } from "../time/parse-plain-time";
import { instantToWallClock } from "../time-zone/instant-to-wall-clock";
import { resolveTimeZone } from "../time-zone/resolve-time-zone";
import { type CellPosition, cellKey, type FocusPosition } from "./grid-point";
import type { GridCells } from "./keyboard";

/** Minutes after midnight of an `HH:mm` string, or `fallback`. */
export function minutesOf(value: string, fallback: number): number {
    const time = parsePlainTime(value);
    return time.ok ? minutesOfDay(time.value) : fallback;
}

/** The cells the model's view shows (`rtl`: the keys' inline direction). */
export function gridCellsOf(model: CalendarModel, rtl: boolean): GridCells {
    const dayGrid = model.get("day-grid") as DayGrid | null;
    const timeGrid = model.get("time-grid") as TimeGrid | null;
    return {
        view: model.state.view.type,
        rtl,
        rows: (dayGrid?.weeks ?? []).map((week) =>
            week.days.map((day) => day.date),
        ),
        columns: (timeGrid?.columns ?? []).map((column) => column.date),
        slots: (timeGrid?.slots ?? []).map((slot) => slot.time),
        hiddenDays: model.state.settings.hiddenDays,
    };
}

/** An occurrence by its id. */
export function occurrenceOf(
    model: CalendarModel,
    occurrenceId: string,
): Occurrence | undefined {
    return model.get("occurrence-by", { id: occurrenceId }) as
        | Occurrence
        | undefined;
}

/** The cell an occurrence starts in, in the model's view. */
export function cellOfOccurrence(
    model: CalendarModel,
    occurrence: { readonly start: string; readonly allDay: boolean },
): CellPosition | null {
    if (occurrence.allDay) return { kind: "day", date: occurrence.start };
    const at = parseDateTime(occurrence.start);
    if (!at.ok) return null;
    const settings = model.state.settings;
    const wall = instantToWallClock(
        at.value.instant,
        resolveTimeZone(settings.timeZone),
    );
    const date = formatPlainDate(wall);
    const timeGrid = model.get("time-grid") as TimeGrid | null;
    if (!timeGrid) return { kind: "day", date };
    const min = minutesOf(settings.slotMinTime, 0);
    const minutes = wall.hour * 60 + wall.minute;
    const index = Math.floor((minutes - min) / settings.slotDuration);
    const slot =
        timeGrid.slots[Math.min(Math.max(index, 0), timeGrid.slots.length - 1)];
    return slot ? { kind: "slot", date, time: slot.time } : null;
}

/** Whether the model's view shows a position. */
export function isShown(
    model: CalendarModel,
    position: FocusPosition,
): boolean {
    if (position.kind === "event") {
        return (model.get("occurrences") as readonly Occurrence[]).some(
            (occurrence) => occurrence.occurrenceId === position.occurrenceId,
        );
    }
    const grid = gridCellsOf(model, false);
    if (position.kind === "slot") {
        return (
            grid.columns.includes(position.date) &&
            grid.slots.includes(position.time)
        );
    }
    return grid.rows.some((dates) => dates.includes(position.date));
}

/**
 * The grid's one tab stop when no shown position is focused: today, else the current range's first
 * day (time grids: the first slot of today's column or of the first one); none in a list view.
 */
export function defaultTabStop(
    model: CalendarModel,
    today: number,
): FocusPosition | null {
    const grid = gridCellsOf(model, false);
    const date = formatPlainDate(fromEpochDay(today));
    if (grid.view === "list") return null;
    if (grid.columns.length > 0) {
        const column = grid.columns.includes(date) ? date : grid.columns[0];
        const time = grid.slots[0];
        return column !== undefined && time !== undefined
            ? { kind: "slot", date: column, time }
            : null;
    }
    const dates = grid.rows.flat();
    if (dates.length === 0) return null;
    if (dates.includes(date)) return { kind: "day", date };
    const current = model.get("current-range") as { start: string };
    const first = dates.includes(current.start) ? current.start : dates[0];
    return first === undefined ? null : { kind: "day", date: first };
}

/** The key of a position's element. */
export function keyOfPosition(position: FocusPosition): string {
    return position.kind === "event"
        ? `event ${position.occurrenceId} ${position.cell.date}`
        : cellKey(position);
}

/** The focus position an element of a part is (days, slots and events are). */
export function positionOfPart(
    model: CalendarModel,
    part: string,
    payload: Readonly<Record<string, unknown>>,
): FocusPosition | null {
    const date = String(payload.date);
    if (part === "day") return { kind: "day", date };
    if (part === "slot") {
        return { kind: "slot", date, time: String(payload.time) };
    }
    if (part !== "event") return null;
    const occurrenceId = String(payload.occurrenceId);
    const occurrence = occurrenceOf(model, occurrenceId);
    let cell = occurrence ? cellOfOccurrence(model, occurrence) : null;
    if (!cell || cell.date !== date) {
        const first = (model.get("time-grid") as TimeGrid | null)?.slots[0]
            ?.time;
        cell =
            cell?.kind === "slot"
                ? { kind: "slot", date, time: first ?? "00:00" }
                : { kind: "day", date };
    }
    return { kind: "event", occurrenceId, cell };
}
