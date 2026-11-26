// The time grid (D11) of a week, day or `days` view: its slots (`slotDuration` from `slotMinTime`
// to `slotMaxTime`) and its columns (the days, hidden ones left out), each with its timed
// occurrences' segments (a multi-day occurrence split per column) as fractions of the column
// (SVAR's percent-space idea): the adapters map them to percentages, never pixels.
//
// The axis is the wall clock of the display zone (FullCalendar's documented behaviour): every
// column shows the same slot labels, and a segment sits at its wall-clock times. A day of 23 or 25
// hours keeps its instants (a segment is the part of the occurrence between the day's first
// instant and the next day's), only its wall-clock positions repeat or skip.
//
// The overlap layout, written fresh from the behaviour D11 describes: occurrences that overlap,
// transitively, form a cluster; within it, each takes the first column free at its start (by
// start, then longer first, then `eventOrder`), the cluster's columns being as many as it needed;
// each is widened to the right up to the first column holding an occurrence it overlaps. An
// occurrence shorter than `eventMinDuration` (a zero-length one) counts as that long.
import { fromEpochDay } from "../time/epoch-day";
import { formatPlainDate } from "../time/format-plain-date";
import { formatPlainTime } from "../time/format-plain-time";
import { minutesOfDay } from "../time/minutes-of-day";
import { parsePlainTime } from "../time/parse-plain-time";
import { startOfDay } from "../time-zone/start-of-day";
import { offsetMilliseconds } from "../time-zone/time-zone-offset";
import { isValidDay } from "../view/valid-days";
import { isHidden, weekdayOf } from "../view/view-days";
import type { LayoutInput, PlacedOccurrence } from "./layout-input";
import type { PartCache } from "./reuse";

/** A slot of the time grid: its wall-clock start, and where it is in a column (0–1). */
export interface TimeSlot {
    /** `HH:mm` */
    readonly time: string;
    readonly top: number;
    readonly height: number;
}

/** A timed occurrence's part within one column. */
export interface TimeSegment {
    readonly eventId: string;
    readonly occurrenceId: string;
    /** where it starts, as a fraction of the column from `slotMinTime` (0–1) */
    readonly top: number;
    /** how long it is, as a fraction of the column (0 for a zero-length occurrence) */
    readonly height: number;
    /** its overlap column, 0-based from the inline start */
    readonly column: number;
    /** how many overlap columns its cluster has */
    readonly columns: number;
    /** how many overlap columns it is widened over (at least 1) */
    readonly span: number;
    /** it started before this column's day (or before `slotMinTime`) */
    readonly continuesBefore: boolean;
    /** it ends after this column's day (or after `slotMaxTime`) */
    readonly continuesAfter: boolean;
}

/** A day of the time grid. */
export interface TimeGridColumn {
    /** `YYYY-MM-DD` */
    readonly date: string;
    readonly today: boolean;
    readonly weekend: boolean;
    readonly past: boolean;
    /** outside `validRange` */
    readonly disabled: boolean;
    readonly segments: readonly TimeSegment[];
}

/** The time grid of a view. */
export interface TimeGrid {
    readonly slots: readonly TimeSlot[];
    readonly columns: readonly TimeGridColumn[];
}

const MINUTE = 60_000;

function minutesOf(value: string, fallback: number): number {
    const time = parsePlainTime(value);
    return time.ok ? minutesOfDay(time.value) : fallback;
}

/** A segment being laid out: its wall-clock minutes in the column, and its overlap interval. */
interface Piece {
    readonly placed: PlacedOccurrence;
    readonly from: number;
    readonly to: number;
    /** the overlap interval's end: at least `eventMinDuration` after `from` */
    readonly until: number;
    readonly continuesBefore: boolean;
    readonly continuesAfter: boolean;
    column: number;
    columns: number;
    span: number;
}

/** The minutes after the day's wall-clock midnight of an instant within the day. */
function wallMinutes(at: number, day: number, timeZone: string): number {
    return (at + offsetMilliseconds(timeZone, at) - day * 86_400_000) / MINUTE;
}

function overlapLayout(pieces: Piece[], compare: LayoutInput["compare"]): void {
    pieces.sort(
        (a, b) =>
            a.from - b.from || b.until - a.until || compare(a.placed, b.placed),
    );
    let cluster: Piece[] = [];
    let clusterEnd = Number.NEGATIVE_INFINITY;
    const close = () => {
        // each piece in the first column free at its start
        const columnEnds: number[] = [];
        const byColumn: Piece[][] = [];
        for (const piece of cluster) {
            let column = columnEnds.findIndex((end) => end <= piece.from);
            if (column < 0) {
                column = columnEnds.length;
                byColumn.push([]);
            }
            columnEnds[column] = piece.until;
            byColumn[column]?.push(piece);
            piece.column = column;
        }
        const count = columnEnds.length;
        for (const piece of cluster) {
            piece.columns = count;
            let reach = count;
            for (let column = piece.column + 1; column < count; column++) {
                const overlaps = byColumn[column]?.some(
                    (other) =>
                        other.from < piece.until && piece.from < other.until,
                );
                if (overlaps) {
                    reach = column;
                    break;
                }
            }
            piece.span = reach - piece.column;
        }
        cluster = [];
    };
    for (const piece of pieces) {
        if (piece.from >= clusterEnd && cluster.length > 0) close();
        cluster.push(piece);
        clusterEnd = Math.max(
            cluster.length === 1 ? Number.NEGATIVE_INFINITY : clusterEnd,
            piece.until,
        );
    }
    if (cluster.length > 0) close();
}

function buildColumn(
    day: number,
    input: LayoutInput,
    min: number,
    max: number,
): { readonly column: TimeGridColumn; readonly sources: readonly object[] } {
    const { timeZone } = input;
    const { eventMinDuration } = input.state.settings;
    const dayStart = startOfDay(fromEpochDay(day), timeZone);
    const dayEnd = startOfDay(fromEpochDay(day + 1), timeZone);
    const pieces: Piece[] = [];
    // a day the zone skips whole (Samoa's 2011-12-30) has no instant: nothing shows on it
    for (const placed of dayEnd > dayStart ? input.placed : []) {
        if (placed.allDay) continue;
        const { startInstant: start, endInstant: end } = placed;
        const zeroLength = start === end;
        if (
            zeroLength
                ? start < dayStart || start >= dayEnd
                : end <= dayStart || start >= dayEnd
        ) {
            continue;
        }
        const from = start <= dayStart ? 0 : wallMinutes(start, day, timeZone);
        const to =
            end >= dayEnd
                ? 1440
                : Math.max(from, wallMinutes(end, day, timeZone));
        const clippedFrom = Math.min(Math.max(from, min), max);
        const clippedTo = Math.min(Math.max(to, min), max);
        // outside the slots shown: only a zero-length occurrence at the very start stays
        if (
            clippedTo <= clippedFrom &&
            !(zeroLength && from >= min && from < max)
        ) {
            continue;
        }
        pieces.push({
            placed,
            from: clippedFrom,
            to: clippedTo,
            until: Math.max(clippedTo, clippedFrom + eventMinDuration),
            continuesBefore: start < dayStart || from < min,
            continuesAfter: end > dayEnd || to > max,
            column: 0,
            columns: 1,
            span: 1,
        });
    }
    overlapLayout(pieces, input.compare);
    const length = max - min;
    const segments = pieces.map((piece) => ({
        eventId: piece.placed.occurrence.eventId,
        occurrenceId: piece.placed.occurrence.occurrenceId,
        top: (piece.from - min) / length,
        height: (piece.to - piece.from) / length,
        column: piece.column,
        columns: piece.columns,
        span: piece.span,
        continuesBefore: piece.continuesBefore,
        continuesAfter: piece.continuesAfter,
    }));
    return {
        column: {
            date: formatPlainDate(fromEpochDay(day)),
            today: day === input.today,
            weekend: input.weekend.includes(weekdayOf(day)),
            past: day < input.today,
            disabled: !isValidDay(day, input.valid),
            segments,
        },
        sources: pieces.map((piece) => piece.placed.event),
    };
}

/** The slots of the settings (the same object while the settings are). */
const slotsBySettings = new WeakMap<object, readonly TimeSlot[]>();

function slotsOf(
    input: LayoutInput,
    min: number,
    max: number,
): readonly TimeSlot[] {
    const { settings } = input.state;
    const cached = slotsBySettings.get(settings);
    if (cached) return cached;
    const slots: TimeSlot[] = [];
    const length = max - min;
    for (let at = min; at < max; at += settings.slotDuration) {
        slots.push(
            Object.freeze({
                time: formatPlainTime({
                    hour: Math.floor(at / 60),
                    minute: at % 60,
                }),
                top: (at - min) / length,
                height:
                    (Math.min(at + settings.slotDuration, max) - at) / length,
            }),
        );
    }
    const frozen = Object.freeze(slots);
    slotsBySettings.set(settings, frozen);
    return frozen;
}

/** The time grid of a week, day or `days` view; `null` for a month or a list view. */
export function timeGrid(
    input: LayoutInput,
    cache: PartCache<TimeGridColumn>,
): TimeGrid | null {
    const { view, settings } = input.state;
    if (view.type === "month" || view.type === "list") return null;
    const min = minutesOf(settings.slotMinTime, 0);
    const max = minutesOf(settings.slotMaxTime, 1440);
    const { visible } = input.days;
    const columns: TimeGridColumn[] = [];
    for (let day = visible.start; day < visible.end; day++) {
        if (isHidden(day, settings.hiddenDays)) continue;
        const { column, sources } = buildColumn(day, input, min, max);
        columns.push(cache.keep(column.date, column, sources));
    }
    cache.done();
    return Object.freeze({
        slots: slotsOf(input, min, max),
        columns: Object.freeze(columns),
    });
}
