// Ranges of days (epoch days, `end` exclusive) as the event sources keep them: merged where they
// touch, so what was fetched reads as few ranges, and what is left to fetch is the requested
// range less them (FullCalendar's lazy fetching, written fresh: only what is not fetched yet).
import type { DateRangeJson } from "../../state/queries";
import { fromEpochDay, toEpochDay } from "../../time/epoch-day";
import { formatPlainDate } from "../../time/format-plain-date";
import { parsePlainDate } from "../../time/parse-plain-date";

/** Days `[start, end)`. */
export interface DayRange {
    readonly start: number;
    readonly end: number;
}

/** A JSON range of days as epoch days, or `undefined` when it is no range (`end` after `start`). */
export function daysOf(
    range: { readonly start?: unknown; readonly end?: unknown } | undefined,
): DayRange | undefined {
    const start = parsePlainDate(range?.start);
    const end = parsePlainDate(range?.end);
    if (!start.ok || !end.ok) return undefined;
    const days = { start: toEpochDay(start.value), end: toEpochDay(end.value) };
    return days.end > days.start ? days : undefined;
}

/** A range of days as JSON. */
export function rangeJson(range: DayRange): DateRangeJson {
    return Object.freeze({
        start: formatPlainDate(fromEpochDay(range.start)),
        end: formatPlainDate(fromEpochDay(range.end)),
    });
}

/** JSON ranges as days (the state's are valid). */
export function daysOfAll(ranges: readonly DateRangeJson[]): DayRange[] {
    return ranges.flatMap((range) => {
        const days = daysOf(range);
        return days ? [days] : [];
    });
}

/** Ranges with one added, merged where they touch or overlap, in order. */
export function withRange(
    ranges: readonly DayRange[],
    added: DayRange,
): DayRange[] {
    const sorted = [...ranges, added].sort((a, b) => a.start - b.start);
    const out: DayRange[] = [];
    for (const range of sorted) {
        const last = out.at(-1);
        if (last && range.start <= last.end) {
            out[out.length - 1] = {
                start: last.start,
                end: Math.max(last.end, range.end),
            };
        } else out.push(range);
    }
    return out;
}

/** Ranges less one: what of them is outside it. */
export function withoutRange(
    ranges: readonly DayRange[],
    removed: DayRange,
): DayRange[] {
    const out: DayRange[] = [];
    for (const range of ranges) {
        if (range.end <= removed.start || range.start >= removed.end) {
            out.push(range);
            continue;
        }
        if (range.start < removed.start)
            out.push({ start: range.start, end: removed.start });
        if (range.end > removed.end)
            out.push({ start: removed.end, end: range.end });
    }
    return out;
}
