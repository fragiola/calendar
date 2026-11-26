// `get("business-hours-in", { range })`: each day's business hours over a range of days (default
// the visible one), as instants in the display zone and as fractions of a time-grid column (the
// axis is the wall clock from `slotMinTime` to `slotMaxTime`, as the time grid's, D11), for the
// app's business-hours fill.
import type { FeatureState } from "../../features/types";
import type { BusinessHoursRange } from "../../state/feature-queries";
import { fromEpochDay, toEpochDay } from "../../time/epoch-day";
import { formatPlainDate } from "../../time/format-plain-date";
import type { Instant } from "../../time/instant";
import { parsePlainDate } from "../../time/parse-plain-date";
import { formatInstant } from "../../time-zone/format-instant";
import { resolveTimeZone } from "../../time-zone/resolve-time-zone";
import { viewDays, weekdayOf } from "../../view/view-days";
import { minutesOf, wallInstant } from "./spans";

const memo = new WeakMap<
    FeatureState,
    Map<string, readonly BusinessHoursRange[]>
>();

/** The days of a payload's range, or the visible range's; `undefined` for a bad one. */
function daysOf(
    state: FeatureState,
    range: { readonly start?: unknown; readonly end?: unknown } | undefined,
): { start: number; end: number } | undefined {
    if (range === undefined)
        return viewDays(state.view, state.settings).visible;
    const start = parsePlainDate(range.start);
    const end = parsePlainDate(range.end);
    return start.ok && end.ok
        ? { start: toEpochDay(start.value), end: toEpochDay(end.value) }
        : undefined;
}

/** The business hours of the days of a range, day by day, in rule order per day. */
export function businessHoursIn(
    state: FeatureState,
    range: { readonly start?: unknown; readonly end?: unknown } | undefined,
): readonly BusinessHoursRange[] {
    const rules = state.settings.businessHours ?? [];
    const days = daysOf(state, range);
    if (!days || rules.length === 0) return Object.freeze([]);
    const key = `${days.start} ${days.end}`;
    let cached = memo.get(state);
    const hit = cached?.get(key);
    if (hit) return hit;
    const zone = resolveTimeZone(state.settings.timeZone);
    const min = minutesOf(state.settings.slotMinTime) ?? 0;
    const max = minutesOf(state.settings.slotMaxTime) ?? 1440;
    const clip = (minutes: number) => Math.min(Math.max(minutes, min), max);
    const list: BusinessHoursRange[] = [];
    for (let day = days.start; day < days.end; day++) {
        for (const rule of rules) {
            if (!rule.daysOfWeek.includes(weekdayOf(day))) continue;
            const start = minutesOf(rule.startTime);
            const end = minutesOf(rule.endTime);
            if (start === undefined || end === undefined) continue;
            list.push(
                Object.freeze({
                    date: formatPlainDate(fromEpochDay(day)),
                    start: formatInstant(
                        wallInstant(day, start, zone) as Instant,
                        zone,
                    ),
                    end: formatInstant(
                        wallInstant(day, end, zone) as Instant,
                        zone,
                    ),
                    top: (clip(start) - min) / (max - min),
                    height: (clip(end) - clip(start)) / (max - min),
                }),
            );
        }
    }
    const frozen = Object.freeze(list);
    if (!cached) {
        cached = new Map();
        memo.set(state, cached);
    }
    cached.set(key, frozen);
    return frozen;
}
