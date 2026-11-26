// Spans of time as instants (half-open `[start, end)`), the constraints' common measure: an
// all-day value's day starts at its start in the display zone (D4: a day is not always 24 hours),
// a date-time is its instant. Business hours are the wall-clock ranges of their weekdays in the
// display zone, made instants day by day, so a DST day keeps 09:00–17:00 on the wall clock.
import type {
    BusinessHours,
    EventConstraint,
} from "../../document/calendar-document";
import { fromEpochDay, toEpochDay } from "../../time/epoch-day";
import type { Instant } from "../../time/instant";
import { minutesOfDay } from "../../time/minutes-of-day";
import { parseDateTime } from "../../time/parse-date-time";
import { parsePlainDate } from "../../time/parse-plain-date";
import { parsePlainTime } from "../../time/parse-plain-time";
import { epochToWallClock } from "../../time/wall-clock-epoch";
import { plainDateInZone } from "../../time-zone/plain-date-in-zone";
import { startOfDay } from "../../time-zone/start-of-day";
import { wallClockToInstant } from "../../time-zone/wall-clock-to-instant";
import { weekdayOf } from "../../view/view-days";

/** A span of time, `end` exclusive, in epoch milliseconds. */
export interface Span {
    readonly start: number;
    readonly end: number;
}

/** A date or a date-time as an instant (a date: its day's start in `zone`), or `undefined`. */
export function instantOf(value: unknown, zone: string): number | undefined {
    const date = parsePlainDate(value);
    if (date.ok) return startOfDay(date.value, zone);
    const at = parseDateTime(value);
    return at.ok ? at.value.instant : undefined;
}

/** The span of an event's or an occurrence's times in `zone` (a zero-length one lasts 1 ms). */
export function spanOf(
    fields: { readonly start: string; readonly end: string },
    zone: string,
): Span | undefined {
    const start = instantOf(fields.start, zone);
    const end = instantOf(fields.end, zone);
    if (start === undefined || end === undefined) return undefined;
    return { start, end: Math.max(end, start + 1) };
}

/** Spans sorted and merged where they touch or overlap. */
export function merged(spans: readonly Span[]): Span[] {
    const sorted = [...spans].sort((a, b) => a.start - b.start);
    const out: Span[] = [];
    for (const span of sorted) {
        const last = out.at(-1);
        if (last && span.start <= last.end) {
            out[out.length - 1] = {
                start: last.start,
                end: Math.max(last.end, span.end),
            };
        } else out.push(span);
    }
    return out;
}

/** Whether one of `spans` holds `span` whole. */
export function contains(spans: readonly Span[], span: Span): boolean {
    return spans.some(
        (range) => range.start <= span.start && span.end <= range.end,
    );
}

/** A rule's minutes after midnight, or `undefined`. */
export function minutesOf(time: string): number | undefined {
    const parsed = parsePlainTime(time);
    return parsed.ok ? minutesOfDay(parsed.value) : undefined;
}

/** The instant of a wall-clock time (minutes after midnight, up to 1440) on an epoch day in `zone`. */
export function wallInstant(
    day: number,
    minutes: number,
    zone: string,
): number {
    return minutes >= 1440
        ? startOfDay(fromEpochDay(day + 1), zone)
        : wallClockToInstant(
              epochToWallClock(day * 86_400_000 + minutes * 60_000),
              zone,
          );
}

/** The business hours of one day (an epoch day of the display zone), as spans. */
export function businessSpansOn(
    rules: readonly Readonly<BusinessHours>[],
    day: number,
    zone: string,
): Span[] {
    const weekday = weekdayOf(day);
    const spans: Span[] = [];
    for (const rule of rules) {
        if (!rule.daysOfWeek.includes(weekday)) continue;
        const start = minutesOf(rule.startTime);
        const end = minutesOf(rule.endTime);
        if (start === undefined || end === undefined) continue;
        spans.push({
            start: wallInstant(day, start, zone),
            end: wallInstant(day, end, zone),
        });
    }
    return merged(spans);
}

/** The display zone's epoch day of an instant. */
export function dayOf(at: number, zone: string): number {
    return toEpochDay(plainDateInZone(at as Instant, zone));
}

/** The business hours around a span (a day of margin each side), merged. */
export function businessSpansAround(
    rules: readonly Readonly<BusinessHours>[],
    span: Span,
    zone: string,
): Span[] {
    const spans: Span[] = [];
    for (
        let day = dayOf(span.start, zone) - 1;
        day <= dayOf(span.end, zone) + 1;
        day++
    ) {
        spans.push(...businessSpansOn(rules, day, zone));
    }
    return merged(spans);
}

/** The ranges of a constraint as spans (open ends unbounded), merged. */
export function constraintSpans(
    constraint: Exclude<Readonly<EventConstraint>, "business-hours">,
    zone: string,
): Span[] {
    return merged(
        constraint.map((range) => ({
            start: instantOf(range.start, zone) ?? Number.NEGATIVE_INFINITY,
            end: instantOf(range.end, zone) ?? Number.POSITIVE_INFINITY,
        })),
    );
}
