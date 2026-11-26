// A selected range's days and instants (`selection()`): what the commands validate, what the part
// attributes mark (`data-selected` on the days and slots it covers) and what the engine builds from
// two cells or two pointer points.
import type { FeatureState, SelectionRange } from "../../features/types";
import { toEpochDay } from "../../time/epoch-day";
import { parseDateTime } from "../../time/parse-date-time";
import { parsePlainDate } from "../../time/parse-plain-date";
import { resolveTimeZone } from "../../time-zone/resolve-time-zone";
import { wallClockToInstant } from "../../time-zone/wall-clock-to-instant";

/** The selection slice of a model's state (`model.state.selection`). */
export interface SelectionSlice {
    /** the selected range (`null`: none); model state, not document */
    readonly selection: SelectionRange | null;
}

/** A range as numbers: epoch days (all-day, end exclusive) or instants (timed). */
export interface RangeSpan {
    readonly start: number;
    readonly end: number;
    readonly allDay: boolean;
}

/** A range's span, or `undefined` when a bound is not of its kind. */
export function spanOf(range: SelectionRange): RangeSpan | undefined {
    if (range.allDay) {
        const start = parsePlainDate(range.start);
        const end = parsePlainDate(range.end);
        return start.ok && end.ok
            ? {
                  start: toEpochDay(start.value),
                  end: toEpochDay(end.value),
                  allDay: true,
              }
            : undefined;
    }
    const start = parseDateTime(range.start);
    const end = parseDateTime(range.end);
    return start.ok && end.ok
        ? {
              start: start.value.instant,
              end: end.value.instant,
              allDay: false,
          }
        : undefined;
}

/** The state's selection. */
export function selectionOf(state: FeatureState): SelectionRange | null {
    return (state.selection as SelectionRange | null | undefined) ?? null;
}

/** Whether a range covers a day (an all-day range), as `data-selected` marks it. */
export function coversDay(range: SelectionRange, date: string): boolean {
    const span = spanOf(range);
    const day = parsePlainDate(date);
    if (!span?.allDay || !day.ok) return false;
    const at = toEpochDay(day.value);
    return at >= span.start && at < span.end;
}

/** Whether a timed range covers a slot's start (a date, an `HH:mm`, in the display zone). */
export function coversSlot(
    range: SelectionRange,
    date: string,
    time: string,
    timeZone: string,
): boolean {
    const span = spanOf(range);
    const day = parsePlainDate(date);
    const match = /^(\d{2}):(\d{2})$/.exec(time);
    if (!span || span.allDay || !day.ok || !match) return false;
    const at = wallClockToInstant(
        {
            ...day.value,
            hour: Number(match[1]),
            minute: Number(match[2]),
            second: 0,
            millisecond: 0,
        },
        resolveTimeZone(timeZone),
    );
    return at >= span.start && at < span.end;
}
