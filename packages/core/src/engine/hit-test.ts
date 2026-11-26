// Hit-testing (D14): a client point to a day of a day grid or a time of a time-grid column, from
// the measured boxes of the elements the adapter registered. Boxes are client rectangles, so a
// right-to-left layout, a scrolled column and a transformed root need nothing more: the engine
// measures them once per gesture and again after a scroll.
import { daysBetween } from "../time/days-between";
import { formatPlainTime } from "../time/format-plain-time";
import { parsePlainDate } from "../time/parse-plain-date";
import { formatInstant } from "../time-zone/format-instant";
import { wallClockToInstant } from "../time-zone/wall-clock-to-instant";
import type { GridPoint } from "./grid-point";

/** A client rectangle, as `getBoundingClientRect` gives it. */
export interface Box {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
}

/** The measured grids: day cells and time-grid columns, each with its date. */
export interface GridGeometry {
    readonly days: readonly { readonly date: string; readonly box: Box }[];
    readonly columns: readonly { readonly date: string; readonly box: Box }[];
}

/** The time grid's axis: its wall-clock minutes, the snap step and the display zone. */
export interface TimeAxis {
    /** `slotMinTime`, minutes after midnight */
    readonly min: number;
    /** `slotMaxTime`, minutes after midnight */
    readonly max: number;
    /** `snapDuration` (the slot's when not set), minutes */
    readonly snap: number;
    /** the display zone, resolved */
    readonly timeZone: string;
}

const inside = (box: Box, x: number, y: number) =>
    x >= box.left && x < box.right && y >= box.top && y < box.bottom;

/** A time point of a column's date at wall-clock `minutes`, in the display zone. */
export function timePoint(
    date: string,
    minutes: number,
    timeZone: string,
): GridPoint | null {
    const parsed = parsePlainDate(date);
    if (!parsed.ok) return null;
    const at = wallClockToInstant(
        {
            ...parsed.value,
            hour: Math.floor(minutes / 60),
            minute: minutes % 60,
            second: 0,
            millisecond: 0,
        },
        timeZone,
    );
    return {
        kind: "time",
        date,
        minutes,
        time: formatPlainTime({
            hour: Math.floor(minutes / 60),
            minute: minutes % 60,
        }),
        at: formatInstant(at, timeZone),
    };
}

/** The day or time under a client point, or `null` outside every grid. */
export function pointAt(
    geometry: GridGeometry,
    x: number,
    y: number,
    axis: TimeAxis,
): GridPoint | null {
    for (const day of geometry.days) {
        if (inside(day.box, x, y)) return { kind: "day", date: day.date };
    }
    for (const column of geometry.columns) {
        const { box } = column;
        if (!inside(box, x, y)) continue;
        const height = box.bottom - box.top;
        const share = height > 0 ? (y - box.top) / height : 0;
        const length = axis.max - axis.min;
        const offset = Math.floor((share * length) / axis.snap) * axis.snap;
        const minutes = Math.min(
            axis.min + Math.max(offset, 0),
            axis.max - axis.snap,
        );
        return timePoint(
            column.date,
            Math.max(minutes, axis.min),
            axis.timeZone,
        );
    }
    return null;
}

/** The days from one date to another (`to` - `from`), 0 for a malformed one. */
export function dayDelta(from: string, to: string): number {
    const a = parsePlainDate(from);
    const b = parsePlainDate(to);
    return a.ok && b.ok ? daysBetween(a.value, b.value) : 0;
}
