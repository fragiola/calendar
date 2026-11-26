// Where things are on a calendar's grids, as the engine names them: a cell (a day of a day grid,
// a slot of a time grid), a focus position (a cell or an event inside one, D12) and a point under
// the pointer (a day, or a time snapped to `snapDuration`, D14). Positions are dates and times,
// never pixels, so a feature reads them the same in every view and direction.

/** A cell of a grid: a day of a day grid (a month day, an all-day cell) or a time-grid slot. */
export type CellPosition =
    | { readonly kind: "day"; readonly date: string }
    | {
          readonly kind: "slot";
          readonly date: string;
          /** the slot's wall-clock start, `HH:mm` */
          readonly time: string;
      };

/** An occurrence focused inside its cell (D12: Enter on a cell moves focus into its events). */
export interface EventPosition {
    readonly kind: "event";
    readonly occurrenceId: string;
    /** the cell it is focused in (Escape goes back to it) */
    readonly cell: CellPosition;
}

/** What holds the grid's one tab stop: a cell, or an event inside one. */
export type FocusPosition = CellPosition | EventPosition;

/** A point of a grid under the pointer (`engine.get("point-at")`), from the measured elements. */
export type GridPoint =
    | {
          /** a day of a day grid: a month day, or an all-day cell of a time grid */
          readonly kind: "day";
          readonly date: string;
      }
    | {
          /** a time of a time-grid column, snapped down to `snapDuration` */
          readonly kind: "time";
          readonly date: string;
          /** the wall-clock minutes after midnight in the display zone, snapped */
          readonly minutes: number;
          /** `HH:mm` of `minutes` */
          readonly time: string;
          /** the instant, RFC 3339 in the display zone */
          readonly at: string;
      };

/** A key naming a cell (`day 2026-11-26`, `slot 2026-11-26 09:30`). */
export function cellKey(cell: CellPosition): string {
    return cell.kind === "day"
        ? `day ${cell.date}`
        : `slot ${cell.date} ${cell.time}`;
}

/** Whether two cells are the same. */
export function sameCell(a: CellPosition, b: CellPosition): boolean {
    return cellKey(a) === cellKey(b);
}
