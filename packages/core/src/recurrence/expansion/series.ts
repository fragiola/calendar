// A recurring event read once (D15): its rule, its zone (the event's `timeZone`, else the display
// zone), its first start, its duration (days, or an instant duration: D4), its excluded dates and
// its overrides, keyed by original start (an epoch day for an all-day event, an instant for a
// timed one, so any offset a key was written with finds it). Occurrences start on the rule's days
// at the first start's wall-clock time in the event's zone (09:00 stays 09:00 across DST; a time
// a DST gap skips moves forward, D4's "compatible").
import type { CalendarEvent } from "../../document/calendar-event";
import type { Occurrence, OccurrenceWindow } from "../../layout/occurrence";
import { fromEpochDay, toEpochDay } from "../../time/epoch-day";
import { formatPlainDate } from "../../time/format-plain-date";
import type { Instant } from "../../time/instant";
import { parseDateTime } from "../../time/parse-date-time";
import { parsePlainDate } from "../../time/parse-plain-date";
import {
    epochToWallClock,
    wallClockToEpoch,
} from "../../time/wall-clock-epoch";
import { formatInstant } from "../../time-zone/format-instant";
import { instantToWallClock } from "../../time-zone/instant-to-wall-clock";
import { wallClockToInstant } from "../../time-zone/wall-clock-to-instant";
import { parseRecurrenceRule } from "../rule/parse-recurrence-rule";
import type { RecurrenceRule } from "../rule/recurrence-rule";
import { ruleDays } from "./rule-days";

const DAY = 86_400_000;

/** An override as the series reads it: its key as written, and its fields. */
export interface SeriesOverride {
    readonly key: string;
    readonly title?: string;
    readonly start?: string;
    readonly end?: string;
    readonly allDay?: boolean;
}

/** A recurring event, read. */
export interface Series {
    readonly event: CalendarEvent;
    readonly rule: RecurrenceRule;
    /** the zone the rule is expanded in, resolved */
    readonly zone: string;
    readonly allDay: boolean;
    /** the first start's day (in `zone` when timed) */
    readonly startDay: number;
    /** a timed series' wall-clock time of day, in milliseconds */
    readonly wallTime: number;
    /** days (all-day) or milliseconds (timed) */
    readonly duration: number;
    /** the last day a start may be on (UNTIL), if any */
    readonly untilDay: number | undefined;
    /** a timed series' last instant a start may be at (a UTC UNTIL), if any */
    readonly untilInstant: number | undefined;
    readonly exdates: ReadonlySet<number>;
    readonly overrides: ReadonlyMap<number, SeriesOverride>;
}

/** One start of the rule: its index (COUNT), its day and key, and its original start. */
export interface SeriesStart {
    readonly index: number;
    readonly day: number;
    /** the epoch day (all-day) or the instant (timed) */
    readonly key: number;
    /** the original start, as the occurrence id writes it */
    readonly start: string;
    readonly end: string;
}

/** The key of an original start written in an event's form (a date, or an RFC 3339 date-time). */
export function keyOf(text: unknown, allDay: boolean): number | undefined {
    if (allDay) {
        const date = parsePlainDate(text);
        return date.ok ? toEpochDay(date.value) : undefined;
    }
    const at = parseDateTime(text);
    return at.ok ? at.value.instant : undefined;
}

const cache = new WeakMap<CalendarEvent, Map<string, Series | null>>();

function read(event: CalendarEvent, zone: string): Series | null {
    const recurrence = event.recurrence;
    if (!recurrence) return null;
    const parsed = parseRecurrenceRule(recurrence.rule);
    const start = keyOf(event.start, event.allDay);
    const end = keyOf(event.end, event.allDay);
    if (!parsed.ok || start === undefined || end === undefined) return null;
    const rule = parsed.value;
    let startDay = start;
    let wallTime = 0;
    if (!event.allDay) {
        const wall = wallClockToEpoch(
            instantToWallClock(start as Instant, zone),
        );
        startDay = Math.floor(wall / DAY);
        wallTime = wall - startDay * DAY;
    }
    let untilDay: number | undefined;
    let untilInstant: number | undefined;
    if (rule.until !== undefined) {
        if (rule.until.includes("T")) {
            untilInstant = keyOf(rule.until, false);
            if (untilInstant !== undefined) {
                const wall = instantToWallClock(untilInstant as Instant, zone);
                untilDay = toEpochDay(wall);
            }
        } else untilDay = keyOf(rule.until, true);
    }
    const exdates = new Set<number>();
    for (const text of recurrence.exdates ?? []) {
        const key = keyOf(text, event.allDay);
        if (key !== undefined) exdates.add(key);
    }
    const overrides = new Map<number, SeriesOverride>();
    for (const [text, fields] of Object.entries(recurrence.overrides ?? {})) {
        const key = keyOf(text, event.allDay);
        if (key !== undefined) overrides.set(key, { ...fields, key: text });
    }
    return {
        event,
        rule,
        zone,
        allDay: event.allDay,
        startDay,
        wallTime,
        duration: end - start,
        untilDay,
        untilInstant,
        exdates,
        overrides,
    };
}

/** A recurring event's series in a zone (the event's own when it has one), or `null`. */
export function seriesOf(
    event: CalendarEvent,
    displayZone: string,
): Series | null {
    const zone = event.timeZone ?? displayZone;
    let byZone = cache.get(event);
    if (!byZone) {
        byZone = new Map();
        cache.set(event, byZone);
    }
    let series = byZone.get(zone);
    if (series === undefined) {
        series = read(event, zone);
        byZone.set(zone, series);
    }
    return series;
}

/** The original start of the rule's start on `day`. */
export function startOn(series: Series, day: number, index = 0): SeriesStart {
    if (series.allDay) {
        return {
            index,
            day,
            key: day,
            start: formatPlainDate(fromEpochDay(day)),
            end: formatPlainDate(fromEpochDay(day + series.duration)),
        };
    }
    const at = wallClockToInstant(
        epochToWallClock(day * DAY + series.wallTime),
        series.zone,
    );
    return {
        index,
        day,
        key: at,
        start: formatInstant(at, series.zone),
        end: formatInstant((at + series.duration) as Instant, series.zone),
    };
}

/**
 * The rule's starts in order, COUNT and UNTIL applied (excluded dates included: they count),
 * until a start's day is after `last`; `from` skips what a rule without COUNT need not walk.
 */
export function* starts(
    series: Series,
    last: number,
    from = series.startDay,
): Generator<SeriesStart> {
    const { rule } = series;
    const bound = Math.min(last, series.untilDay ?? last);
    let index = 0;
    for (const day of ruleDays(
        rule,
        series.startDay,
        bound,
        rule.count === undefined ? from : series.startDay,
    )) {
        if (day > bound) return;
        if (rule.count !== undefined && index >= rule.count) return;
        const start = startOn(series, day, index);
        if (
            series.untilInstant !== undefined &&
            start.key > series.untilInstant
        ) {
            return;
        }
        index++;
        yield start;
    }
}

/** The start of the rule at a key, if the rule gives one there (excluded or not). */
export function startAt(series: Series, key: number): SeriesStart | undefined {
    const day = series.allDay
        ? key
        : toEpochDay(instantToWallClock(key as Instant, series.zone));
    for (const start of starts(series, day + 1, day - 1)) {
        if (start.key === key) return start;
        if (start.key > key) return undefined;
    }
    return undefined;
}

/** How many starts the rule gives before a key (excluded ones too: COUNT counts them). */
export function countBefore(series: Series, key: number): number {
    let count = 0;
    const day = series.allDay
        ? key
        : toEpochDay(instantToWallClock(key as Instant, series.zone));
    for (const start of starts(series, day + 1)) {
        if (start.key >= key) break;
        count++;
    }
    return count;
}

const objects = new WeakMap<Series, Map<string, Occurrence>>();

/** The occurrence of a start: its override applied, the same object for the same series. */
export function occurrenceOf(series: Series, start: SeriesStart): Occurrence {
    const occurrenceId = `${series.event.id}@${start.start}`;
    let made = objects.get(series);
    if (!made) {
        made = new Map();
        objects.set(series, made);
    }
    let occurrence = made.get(occurrenceId);
    if (!occurrence) {
        const override = series.overrides.get(start.key);
        occurrence = Object.freeze({
            occurrenceId,
            eventId: series.event.id,
            start: override?.start ?? start.start,
            end: override?.end ?? start.end,
            allDay: override?.allDay ?? series.allDay,
            ...(override?.title === undefined ? {} : { title: override.title }),
        });
        made.set(occurrenceId, occurrence);
    }
    return occurrence;
}

/** The first and last day an occurrence of an override touches (a margin's worth, by day). */
function overrideDays(
    series: Series,
    override: SeriesOverride,
    base: SeriesStart,
): [number, number] {
    const allDay = override.allDay ?? series.allDay;
    const start = keyOf(override.start ?? base.start, allDay) ?? 0;
    const end = keyOf(override.end ?? base.end, allDay) ?? start;
    return allDay
        ? [start, end]
        : [Math.floor(start / DAY) - 1, Math.ceil(end / DAY) + 1];
}

const windows = new WeakMap<
    Series,
    { key: string; list: readonly Occurrence[] }
>();

/**
 * The occurrences of a series that may touch a window (in the display zone: a margin of two days
 * covers any zone's offset), excluded dates left out, overrides where they moved to.
 */
export function windowOccurrences(
    series: Series,
    within: OccurrenceWindow,
): readonly Occurrence[] {
    const first = toEpochDay(within.range.start);
    const end = toEpochDay(within.range.end);
    const key = `${first} ${end}`;
    const cached = windows.get(series);
    if (cached?.key === key) return cached.list;
    const spanDays = series.allDay
        ? series.duration
        : Math.ceil(series.duration / DAY);
    const found: SeriesStart[] = [];
    for (const start of starts(series, end + 2, first - spanDays - 2)) {
        if (start.day + spanDays + 2 < first) continue;
        if (series.exdates.has(start.key) || series.overrides.has(start.key)) {
            continue;
        }
        found.push(start);
    }
    for (const [at, override] of series.overrides) {
        if (series.exdates.has(at)) continue;
        const start = startAt(series, at);
        if (!start) continue;
        const [from, to] = overrideDays(series, override, start);
        if (to + 2 >= first && from - 2 <= end) found.push(start);
    }
    found.sort((a, b) => a.key - b.key);
    const frozen = Object.freeze(
        found.map((start) => occurrenceOf(series, start)),
    );
    windows.set(series, { key, list: frozen });
    return frozen;
}
