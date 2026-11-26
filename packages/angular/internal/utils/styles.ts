// The structural style of the positioned parts (D18), React's `segmentStyle`, `timeSegmentStyle`,
// `rowSegmentStyle` and `previewStyle`: the layout's lanes, spans and fractions as logical
// properties and percentages, from the app's custom properties (`--calendar-lane-size`,
// `--calendar-day-gap`, `--calendar-row-inset`), never pixels.
import type {
    DayGridWeek,
    PreviewSegments,
    Segment,
    TimeGridColumn,
    TimeSegment,
} from "@fragiola/calendar";
import type { StructuralStyle } from "./helpers";

/** The height of a day-grid lane: the app's `--calendar-lane-size` (default `1.5rem`). */
export const LANE_SIZE = "var(--calendar-lane-size, 1.5rem)";

/** The space between two days' event areas in a row: the app's `--calendar-day-gap` (default 0). */
const DAY_GAP = "var(--calendar-day-gap, 0px)";

/** The row's space before its first day (a week number, a label): the app's `--calendar-row-inset`. */
const ROW_INSET = "var(--calendar-row-inset, 0px)";

/**
 * A day-grid segment in its day's `[calendarDayEvents]`: its lane from the top (`lane` lanes of
 * `--calendar-lane-size`), its width over `span` days (each day's event area plus
 * `--calendar-day-gap` between two), on logical properties (right to left needs nothing more).
 */
export function segmentStyle(segment: Segment): StructuralStyle {
    return {
        position: "absolute",
        insetInlineStart: 0,
        insetBlockStart: `calc(${segment.lane} * ${LANE_SIZE})`,
        blockSize: LANE_SIZE,
        inlineSize:
            segment.span === 1
                ? "100%"
                : `calc(${segment.span} * 100% + ${segment.span - 1} * ${DAY_GAP})`,
    };
}

/** A time-grid segment: its layout fractions as percentages of its column, on logical properties. */
export function timeSegmentStyle(segment: TimeSegment): StructuralStyle {
    return {
        position: "absolute",
        top: `${segment.top * 100}%`,
        height: `${segment.height * 100}%`,
        insetInlineStart: `${(segment.column / segment.columns) * 100}%`,
        width: `${(segment.span / segment.columns) * 100}%`,
    };
}

/**
 * A decoration over a day-grid row (a selection, a drag preview), the row its containing block:
 * over its `span` days from `startColumn`, the full height of the row, after the row's
 * `--calendar-row-inset`, on logical properties.
 */
export function rowSegmentStyle(
    segment: Segment,
    days: number,
): StructuralStyle {
    const width = `(100% - ${ROW_INSET})`;
    return {
        position: "absolute",
        insetBlock: 0,
        insetInlineStart: `calc(${ROW_INSET} + ${width} * ${segment.startColumn / days})`,
        inlineSize: `calc(${width} * ${segment.span / days})`,
    };
}

/** Where a decoration is: in a column (time grid), else in a row (day grid). */
export interface Where {
    readonly column: TimeGridColumn | undefined;
    readonly week: DayGridWeek | undefined;
}

/** A preview's segment where it is (a column, a row). */
export function previewStyle(
    segment: TimeSegment | Segment,
    where: Where,
): StructuralStyle | undefined {
    if (where.column) return timeSegmentStyle(segment as TimeSegment);
    if (where.week) {
        return rowSegmentStyle(segment as Segment, where.week.days.length);
    }
    return undefined;
}

/** A preview's segments in a column (time grid) or a row (day grid). */
export function previewSegmentsIn(
    preview: PreviewSegments | null | undefined,
    where: Where,
): readonly (TimeSegment | Segment)[] {
    if (!preview) return [];
    if (where.column) {
        const date = where.column.date;
        return preview.columns.find((one) => one.date === date)?.segments ?? [];
    }
    if (where.week) {
        const id = where.week.id;
        return preview.weeks.find((one) => one.weekId === id)?.segments ?? [];
    }
    return [];
}
