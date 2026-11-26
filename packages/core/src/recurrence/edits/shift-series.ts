// A series changed as a whole (D15's `all`), or the series that continues it from an occurrence
// (`following`): every occurrence moves by the edited occurrence's delta, measured on the wall
// clock of the event's zone (a series at 09:00 moved to 10:00 stays at 10:00 across DST), and
// takes its new duration; its excluded dates and overrides move with it. A delta of whole days
// keeps the rule only when the rule's days come from its start, or from a weekly (or daily) BYDAY
// every week (its weekdays shift); any other rule part (BYMONTHDAY, BYMONTH, an ordinal, an
// INTERVAL over weeks) would change its pattern, so such a move is refused, never approximated.
// A series never turns between all-day and timed: refused too.

import { type Failure, fail } from "../../commands/define";
import type { RecurrenceJson } from "../../document/calendar-document";
import type { CalendarEvent } from "../../document/calendar-event";
import { toEvent } from "../../document/entities";
import type { Occurrence } from "../../layout/occurrence";
import { fromEpochDay } from "../../time/epoch-day";
import { formatDateTime } from "../../time/format-date-time";
import { formatPlainDate } from "../../time/format-plain-date";
import type { Instant } from "../../time/instant";
import {
    epochToWallClock,
    wallClockToEpoch,
} from "../../time/wall-clock-epoch";
import { formatInstant } from "../../time-zone/format-instant";
import { instantToWallClock } from "../../time-zone/instant-to-wall-clock";
import { wallClockToInstant } from "../../time-zone/wall-clock-to-instant";
import {
    countBefore,
    keyOf,
    type Series,
    type SeriesStart,
} from "../expansion/series";
import { formatRecurrenceRule } from "../rule/format-recurrence-rule";
import type { RecurrenceRule } from "../rule/recurrence-rule";

const DAY = 86_400_000;

/** A UTC UNTIL (`YYYY-MM-DDTHH:MM:SSZ`) of an instant, to the second. */
function utcUntil(at: number): string {
    return formatDateTime((Math.floor(at / 1000) * 1000) as Instant, 0);
}

function wallOf(at: number, zone: string): number {
    return wallClockToEpoch(instantToWallClock(at as Instant, zone));
}

/** The rule with its weekdays moved by whole days, or the refusal of a move its pattern forbids. */
function shiftedRule(
    rule: RecurrenceRule,
    days: number,
): RecurrenceRule | Failure {
    if (days === 0 || (!rule.byDay && !rule.byMonthDay && !rule.byMonth)) {
        return rule;
    }
    if (
        (rule.freq === "WEEKLY" || rule.freq === "DAILY") &&
        rule.interval === 1 &&
        !rule.byMonthDay &&
        !rule.byMonth &&
        rule.byDay?.every((day) => day.ordinal === undefined)
    ) {
        const shift = ((days % 7) + 7) % 7;
        return {
            ...rule,
            byDay: rule.byDay.map((day) => ({
                weekday: ((day.weekday + shift) %
                    7) as RecurrenceRule["weekStart"],
            })),
        };
    }
    return fail(
        "refused",
        'moving every occurrence by whole days would change the rule\'s pattern (its BYDAY, BYMONTHDAY or BYMONTH): move this occurrence alone (scope "this"), or change the rule with event.set-recurrence',
        "/scope",
    );
}

/** The excluded dates and overrides at or after a key, or before it. */
function part<V>(
    entries: Iterable<readonly [number, V]>,
    at: number,
    after: boolean,
): (readonly [number, V])[] {
    return [...entries].filter(([key]) => key >= at === after);
}

/** The series before an occurrence: its rule ends (UNTIL) just before it, what follows it dropped. */
export function seriesBefore(
    series: Series,
    start: SeriesStart,
): CalendarEvent {
    const { rule, event } = series;
    const until = series.allDay
        ? formatPlainDate(fromEpochDay(start.key - 1))
        : utcUntil(start.key - 1000);
    const { count: _count, ...kept } = rule;
    const exdates = part(
        [...series.exdates].map((key) => [key, key] as const),
        start.key,
        false,
    );
    const texts = new Map(
        (event.recurrence?.exdates ?? []).map((text) => [
            keyOf(text, series.allDay),
            text,
        ]),
    );
    const overrides = part(series.overrides, start.key, false);
    return toEvent(
        {
            ...event,
            recurrence: recurrenceJson(
                formatRecurrenceRule({ ...kept, until }),
                exdates.map(([key]) => texts.get(key) ?? ""),
                Object.fromEntries(
                    overrides.map(([, { key, ...fields }]) => [key, fields]),
                ),
            ),
        },
        event.id,
    );
}

function recurrenceJson(
    rule: string,
    exdates: readonly string[],
    overrides: Readonly<Record<string, object>>,
): RecurrenceJson {
    return {
        rule,
        ...(exdates.length > 0 ? { exdates: [...exdates] } : {}),
        ...(Object.keys(overrides).length > 0
            ? { overrides: overrides as RecurrenceJson["overrides"] }
            : {}),
    };
}

/**
 * The series moved as the edit moved one of its occurrences (`occurrence` → `next`), whole
 * (`from` absent: `all`) or from the rule's start `from` on (`following`: the new series, its id
 * `id`); a refusal when its rule would change.
 */
export function shiftSeries(
    series: Series,
    occurrence: Occurrence,
    next: CalendarEvent,
    displayZone: string,
    from?: { readonly start: SeriesStart; readonly id: string },
): CalendarEvent | Failure {
    const { event, rule } = series;
    if (next.allDay !== occurrence.allDay) {
        return fail(
            "refused",
            'a series stays all-day or timed: change this occurrence alone (scope "this")',
            "/allDay",
        );
    }
    const allDay = series.allDay;
    const oldZone = series.zone;
    const newZone = next.timeZone ?? displayZone;
    const before = keyOf(occurrence.start, allDay) ?? 0;
    const after = keyOf(next.start, allDay) ?? 0;
    const duration = (keyOf(next.end, allDay) ?? 0) - after;
    const delta = allDay
        ? after - before
        : wallOf(after, oldZone) - wallOf(before, oldZone);
    /** a key moved by the delta */
    const moved = (key: number): number =>
        allDay
            ? key + delta
            : wallClockToInstant(
                  epochToWallClock(wallOf(key, oldZone) + delta),
                  oldZone,
              );
    const write = (key: number, isAllDay = allDay): string =>
        isAllDay
            ? formatPlainDate(fromEpochDay(key))
            : formatInstant(key as Instant, newZone);
    const base = from ? from.start.key : (keyOf(event.start, allDay) ?? 0);
    const start = moved(base);
    const days = allDay
        ? delta
        : Math.floor(wallOf(start, newZone) / DAY) -
          Math.floor(wallOf(base, oldZone) / DAY);
    const shifted = shiftedRule(rule, days);
    if ("ok" in shifted) return shifted;
    let nextRule: RecurrenceRule = shifted;
    if (rule.until !== undefined) {
        const until = rule.until.includes("T")
            ? utcUntil(moved(keyOf(rule.until, false) ?? 0))
            : formatPlainDate(
                  fromEpochDay((keyOf(rule.until, true) ?? 0) + days),
              );
        nextRule = { ...nextRule, until };
    }
    if (from && rule.count !== undefined) {
        nextRule = {
            ...nextRule,
            count: rule.count - countBefore(series, from.start.key),
        };
    }
    const unchanged =
        nextRule === rule && !from && delta === 0 && newZone === oldZone;
    // an original start of the old series → the same start of the new one: its day moved by the
    // days, at the new series' wall-clock time in its zone (exact across DST and a zone change)
    const startWall = wallOf(start, newZone);
    const newWall = startWall - Math.floor(startWall / DAY) * DAY;
    const rekey = (key: number): number =>
        allDay
            ? key + delta
            : wallClockToInstant(
                  epochToWallClock(
                      (Math.floor(wallOf(key, oldZone) / DAY) + days) * DAY +
                          newWall,
                  ),
                  newZone,
              );
    const texts = new Map(
        (event.recurrence?.exdates ?? []).map((text) => [
            keyOf(text, allDay),
            text,
        ]),
    );
    const exdates = part(
        [...series.exdates].map((key) => [key, key] as const),
        from?.start.key ?? Number.NEGATIVE_INFINITY,
        true,
    ).map(([key]) =>
        unchanged ? (texts.get(key) ?? write(key)) : write(rekey(key)),
    );
    const edited = keyOf(
        occurrence.occurrenceId.slice(
            occurrence.occurrenceId.lastIndexOf("@") + 1,
        ),
        allDay,
    );
    const overrides: Record<string, object> = {};
    for (const [key, override] of part(
        series.overrides,
        from?.start.key ?? Number.NEGATIVE_INFINITY,
        true,
    )) {
        const { key: text, ...fields } = override;
        const own: Record<string, unknown> = { ...fields };
        if (key === edited && fields.start !== undefined) {
            // the occurrence edited had times of its own: it takes the edit's
            own.start = next.start;
            own.end = next.end;
        } else if (
            !unchanged &&
            fields.start !== undefined &&
            fields.end !== undefined
        ) {
            const ownAllDay = fields.allDay ?? allDay;
            const shift = (value: string) => {
                const at = keyOf(value, ownAllDay) ?? 0;
                return ownAllDay
                    ? formatPlainDate(fromEpochDay(at + days))
                    : formatInstant(
                          (allDay ? at + days * DAY : moved(at)) as Instant,
                          newZone,
                      );
            };
            own.start = shift(fields.start);
            own.end = shift(fields.end);
        }
        overrides[unchanged ? text : write(rekey(key))] = own;
    }
    const titleChanged = next.title !== (occurrence.title ?? event.title);
    return toEvent(
        {
            ...next,
            id: from?.id ?? event.id,
            title: titleChanged ? next.title : event.title,
            start: write(start),
            end: write(start + duration),
            recurrence: recurrenceJson(
                unchanged
                    ? (event.recurrence?.rule ?? "")
                    : formatRecurrenceRule(nextRule),
                exdates,
                overrides,
            ),
        },
        from?.id ?? event.id,
    );
}
