// The day grid (D11): a month view's weeks, or the all-day row of a time-grid view, each row its
// days (the columns, hidden days left out) and the segments of the occurrences on them (an
// occurrence's part within one row). Segments are packed into lanes, written fresh from the
// behaviour FullCalendar documents: by start, then longer first, then `eventOrder`, each in the
// lowest lane free over all its columns. With a lane limit (`dayMaxEvents`, or the engine's
// measured `maxLanes` for `"auto"`), a segment in a lane past it is hidden, and each day reports
// how many of its occurrences are (`hiddenCount`, `hiddenOccurrenceIds`: the app's "+N more").
import { isoWeekOfYear } from "../locale/iso-week-of-year";
import { weekInfo } from "../locale/week-info";
import { weekOfYear } from "../locale/week-of-year";
import { fromEpochDay } from "../time/epoch-day";
import { formatPlainDate } from "../time/format-plain-date";
import { isValidDay } from "../view/valid-days";
import {
    firstDayOf,
    isHidden,
    startOfWeek,
    weekdayOf,
} from "../view/view-days";
import type { LayoutInput, PlacedOccurrence } from "./layout-input";
import type { PartCache } from "./reuse";

/** A day of a day grid (D11, D17's `data-*` state). */
export interface DayCell {
    /** `YYYY-MM-DD` */
    readonly date: string;
    readonly today: boolean;
    /** outside the month a month view is about */
    readonly outside: boolean;
    /** a weekend day of the locale */
    readonly weekend: boolean;
    readonly past: boolean;
    /** outside `validRange` */
    readonly disabled: boolean;
    /** how many of its occurrences are hidden by the lane limit */
    readonly hiddenCount: number;
    readonly hiddenOccurrenceIds: readonly string[];
}

/** An occurrence's part within one row of a day grid. */
export interface Segment {
    readonly eventId: string;
    readonly occurrenceId: string;
    readonly allDay: boolean;
    /** its first column, 0-based from the row's inline start */
    readonly startColumn: number;
    /** how many columns it covers */
    readonly span: number;
    /** its lane, 0 at the top */
    readonly lane: number;
    /** it started before this row's first column it covers */
    readonly continuesBefore: boolean;
    /** it ends after this row's last column it covers */
    readonly continuesAfter: boolean;
}

/** A row of a day grid: a week of a month view, or a time-grid view's all-day row. */
export interface DayGridWeek {
    /** the row's first day (`YYYY-MM-DD`): its key */
    readonly id: string;
    /** the week number of the row, under the `weekNumbers` setting */
    readonly weekNumber: number;
    readonly days: readonly DayCell[];
    /** the segments shown (hidden ones left out), by lane then column */
    readonly segments: readonly Segment[];
    /** how many lanes the shown segments use */
    readonly lanes: number;
}

/** The day grid of a view. */
export interface DayGrid {
    readonly weeks: readonly DayGridWeek[];
}

/** What a row is built from: its columns' days, and whether it holds timed occurrences too. */
interface RowSpec {
    readonly columns: readonly number[];
    readonly withTimed: boolean;
    /** the 7 days of the week the row is (its middle day numbers it) */
    readonly weekStart: number;
}

function weekNumberOf(day: number, input: LayoutInput): number {
    const { settings } = input.state;
    const date = fromEpochDay(day);
    if (settings.weekNumbers === "iso") return isoWeekOfYear(date).week;
    const rules = weekInfo(
        settings.locale,
        settings.firstDayOfWeek === undefined
            ? {}
            : { firstDayOfWeek: settings.firstDayOfWeek },
    );
    return weekOfYear(date, rules).week;
}

interface Candidate {
    readonly placed: PlacedOccurrence;
    readonly startColumn: number;
    readonly span: number;
    readonly continuesBefore: boolean;
    readonly continuesAfter: boolean;
}

function buildRow(
    spec: RowSpec,
    input: LayoutInput,
    maxLanes: number | undefined,
): { readonly row: DayGridWeek; readonly sources: readonly object[] } {
    const { columns } = spec;
    const first = columns[0] ?? spec.weekStart;
    const last = columns[columns.length - 1] ?? spec.weekStart;
    const candidates: Candidate[] = [];
    for (const placed of input.placed) {
        if (!spec.withTimed && !placed.allDay) continue;
        if (placed.endDay <= first || placed.startDay > last) continue;
        let startColumn = -1;
        let end = -1;
        columns.forEach((day, column) => {
            if (day >= placed.startDay && day < placed.endDay) {
                if (startColumn < 0) startColumn = column;
                end = column;
            }
        });
        if (startColumn < 0) continue;
        candidates.push({
            placed,
            startColumn,
            span: end - startColumn + 1,
            continuesBefore: placed.startDay < (columns[startColumn] ?? first),
            continuesAfter: placed.endDay > (columns[end] ?? last) + 1,
        });
    }
    candidates.sort(
        (a, b) =>
            a.startColumn - b.startColumn ||
            b.span - a.span ||
            input.compare(a.placed, b.placed),
    );
    // occupied[column] holds the lanes taken there
    const occupied: Set<number>[] = columns.map(() => new Set());
    const segments: Segment[] = [];
    const hidden: string[][] = columns.map(() => []);
    let lanes = 0;
    for (const candidate of candidates) {
        let lane = 0;
        const covers = (at: number) => {
            for (
                let c = candidate.startColumn;
                c < candidate.startColumn + candidate.span;
                c++
            ) {
                if (occupied[c]?.has(at)) return true;
            }
            return false;
        };
        while (covers(lane)) lane++;
        for (
            let c = candidate.startColumn;
            c < candidate.startColumn + candidate.span;
            c++
        ) {
            occupied[c]?.add(lane);
        }
        const { occurrence } = candidate.placed;
        if (maxLanes !== undefined && lane >= maxLanes) {
            for (
                let c = candidate.startColumn;
                c < candidate.startColumn + candidate.span;
                c++
            ) {
                hidden[c]?.push(occurrence.occurrenceId);
            }
            continue;
        }
        lanes = Math.max(lanes, lane + 1);
        segments.push({
            eventId: occurrence.eventId,
            occurrenceId: occurrence.occurrenceId,
            allDay: occurrence.allDay,
            startColumn: candidate.startColumn,
            span: candidate.span,
            lane,
            continuesBefore: candidate.continuesBefore,
            continuesAfter: candidate.continuesAfter,
        });
    }
    segments.sort((a, b) => a.lane - b.lane || a.startColumn - b.startColumn);
    const { current } = input.days;
    const month = input.state.view.type === "month";
    const days = columns.map((day, column) => {
        const hiddenIds = hidden[column] ?? [];
        return {
            date: formatPlainDate(fromEpochDay(day)),
            today: day === input.today,
            outside: month && (day < current.start || day >= current.end),
            weekend: input.weekend.includes(weekdayOf(day)),
            past: day < input.today,
            disabled: !isValidDay(day, input.valid),
            hiddenCount: hiddenIds.length,
            hiddenOccurrenceIds: hiddenIds,
        };
    });
    return {
        row: {
            id: formatPlainDate(fromEpochDay(first)),
            weekNumber: weekNumberOf(spec.weekStart + 3, input),
            days,
            segments,
            lanes,
        },
        sources: candidates.map((candidate) => candidate.placed.event),
    };
}

/** The lane limit in effect: `dayMaxEvents` when a number, the engine's `maxLanes` for `"auto"`. */
function laneLimit(
    input: LayoutInput,
    maxLanes: number | undefined,
): number | undefined {
    const { dayMaxEvents } = input.state.settings;
    if (typeof dayMaxEvents === "number") return dayMaxEvents;
    return dayMaxEvents === "auto" ? maxLanes : undefined;
}

/**
 * The day grid of the view: a month view's weeks (all-day and timed occurrences), or a time-grid
 * view's all-day row (all-day occurrences); `null` for a list view. `maxLanes` is the engine's
 * measured limit for `dayMaxEvents: "auto"`.
 */
export function dayGrid(
    input: LayoutInput,
    cache: PartCache<DayGridWeek>,
    maxLanes?: number,
): DayGrid | null {
    const { view, settings } = input.state;
    if (view.type === "list") return null;
    const limit = laneLimit(input, maxLanes);
    const hiddenDays = settings.hiddenDays;
    const specs: RowSpec[] = [];
    if (view.type === "month") {
        const { grid } = input.days;
        for (let start = grid.start; start < grid.end; start += 7) {
            const columns: number[] = [];
            for (let day = start; day < start + 7; day++) {
                if (!isHidden(day, hiddenDays)) columns.push(day);
            }
            specs.push({ columns, withTimed: true, weekStart: start });
        }
    } else {
        const { visible } = input.days;
        const columns: number[] = [];
        for (let day = visible.start; day < visible.end; day++) {
            if (!isHidden(day, hiddenDays)) columns.push(day);
        }
        specs.push({
            columns,
            withTimed: false,
            weekStart: startOfWeek(visible.start, firstDayOf(settings)),
        });
    }
    const weeks = specs.map((spec) => {
        const { row, sources } = buildRow(spec, input, limit);
        return cache.keep(row.id, row, sources);
    });
    cache.done();
    return Object.freeze({ weeks: Object.freeze(weeks) });
}
