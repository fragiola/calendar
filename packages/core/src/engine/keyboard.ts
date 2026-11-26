// The keyboard model over a calendar's cells (D12), a pure function of the grid's dates: the date
// picker's keys, extended to the time grid's slots. Arrows move by a day (inline, mirrored right to
// left) and by a week (month) or a slot (time grid); Home and End go to the row's first and last
// day; PageUp and PageDown change the range by the view's own step, Shift with them by a year
// (month) or a week (time grids). A move past the grid's dates asks the engine to navigate there.
import type { ViewType } from "../document/calendar-document";
import { addDays } from "../time/add-days";
import { addMonths } from "../time/add-months";
import type { Weekday } from "../time/day-of-week";
import { fromEpochDay, toEpochDay } from "../time/epoch-day";
import { formatPlainDate } from "../time/format-plain-date";
import { parsePlainDate } from "../time/parse-plain-date";
import { skipHidden } from "../view/view-days";
import type { CellPosition } from "./grid-point";

/** The cells a view shows, as the keys move over them. */
export interface GridCells {
    readonly view: ViewType;
    readonly rtl: boolean;
    /** the day grid's rows: a month's weeks, or a time grid's all-day row (none: no day grid) */
    readonly rows: readonly (readonly string[])[];
    /** the time grid's columns (days) */
    readonly columns: readonly string[];
    /** the time grid's slots (`HH:mm`) */
    readonly slots: readonly string[];
    readonly hiddenDays: readonly Weekday[];
}

/**
 * Where a key takes focus from a cell: a cell the view shows, a cell of another range (`navigate`:
 * the engine goes to its date first), the same column of the next or previous range (`step`), or
 * `null` (not a key of the grid, or nowhere to go).
 */
export type KeyTarget =
    | { readonly cell: CellPosition; readonly navigate: boolean }
    | {
          readonly step: 1 | -1;
          readonly column: number;
          readonly cell: CellPosition;
      }
    | null;

function shift(date: string, days: number): string {
    const parsed = parsePlainDate(date);
    return parsed.ok ? formatPlainDate(addDays(parsed.value, days)) : date;
}

/** The next day after (or before) `date` that is not hidden. */
function nextShown(
    date: string,
    step: 1 | -1,
    hidden: readonly Weekday[],
): string {
    const parsed = parsePlainDate(date);
    if (!parsed.ok) return date;
    return formatPlainDate(
        fromEpochDay(skipHidden(toEpochDay(parsed.value) + step, step, hidden)),
    );
}

function months(date: string, count: number): string {
    const parsed = parsePlainDate(date);
    return parsed.ok ? formatPlainDate(addMonths(parsed.value, count)) : date;
}

function withDate(cell: CellPosition, date: string): CellPosition {
    return cell.kind === "day"
        ? { kind: "day", date }
        : { kind: "slot", date, time: cell.time };
}

/** The cell a key takes focus to from `cell`, or `null`. Keys with Ctrl, Alt or Meta are not the grid's. */
export function keyTarget(
    cell: CellPosition,
    event: Pick<
        KeyboardEvent,
        "key" | "shiftKey" | "ctrlKey" | "altKey" | "metaKey"
    >,
    grid: GridCells,
): KeyTarget {
    if (event.ctrlKey || event.altKey || event.metaKey) return null;
    const month = grid.view === "month";
    const inline = (forward: boolean) => (forward !== grid.rtl ? 1 : -1);
    // the cells of the line the keys move along inline: a month's week, or the time grid's days
    const row =
        cell.kind === "day" && month
            ? grid.rows.find((dates) => dates.includes(cell.date))
            : grid.columns.length > 0
              ? grid.columns
              : grid.rows[0];
    const column = row ? row.indexOf(cell.date) : -1;
    const inView = (date: string) =>
        cell.kind === "day" && month
            ? grid.rows.some((dates) => dates.includes(date))
            : (row ?? []).includes(date);
    const to = (date: string): KeyTarget => {
        const next = withDate(cell, date);
        return { cell: next, navigate: !inView(date) };
    };
    if (event.shiftKey && event.key !== "PageUp" && event.key !== "PageDown")
        return null;
    switch (event.key) {
        case "ArrowLeft":
        case "ArrowRight": {
            const step = inline(event.key === "ArrowRight");
            const at = row?.[column + step];
            return at !== undefined
                ? to(at)
                : to(nextShown(cell.date, step, grid.hiddenDays));
        }
        case "ArrowUp":
        case "ArrowDown": {
            const down = event.key === "ArrowDown";
            if (cell.kind === "day" && month) {
                return to(shift(cell.date, down ? 7 : -7));
            }
            if (cell.kind === "day") {
                // the all-day row is the time grid's first row
                const first = grid.slots[0];
                return down && first !== undefined && grid.columns.length > 0
                    ? {
                          cell: { kind: "slot", date: cell.date, time: first },
                          navigate: false,
                      }
                    : null;
            }
            const slot = grid.slots.indexOf(cell.time) + (down ? 1 : -1);
            const time = grid.slots[slot];
            if (time !== undefined) {
                return {
                    cell: { kind: "slot", date: cell.date, time },
                    navigate: false,
                };
            }
            return !down && grid.rows.length > 0
                ? { cell: { kind: "day", date: cell.date }, navigate: false }
                : null;
        }
        case "Home":
        case "End": {
            if (!row || row.length === 0) return null;
            // the week's first and last days, whichever side they are on
            const date = event.key === "Home" ? row[0] : row[row.length - 1];
            return date === undefined ? null : to(date);
        }
        case "PageUp":
        case "PageDown": {
            const forward = event.key === "PageDown" ? 1 : -1;
            if (month) {
                return to(
                    months(cell.date, forward * (event.shiftKey ? 12 : 1)),
                );
            }
            if (event.shiftKey) return to(shift(cell.date, forward * 7));
            return { step: forward, column: Math.max(column, 0), cell };
        }
        default:
            return null;
    }
}
