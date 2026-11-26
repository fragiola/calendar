// The days a view covers, as epoch days with exclusive ends (D7), from FullCalendar's documented
// behaviour for its views (`DateProfileGenerator`'s, written fresh): a month view's `current`
// range is the anchor's month and its grid the whole weeks holding it (six with `fixedWeekCount`);
// a week view is the anchor's week; a day view skips hidden days forward; a `days` view counts
// `days` days that are not hidden; a list covers `duration` days from the anchor, or its month.
// The `visible` range is the grid's, its hidden edge days left out.
import type { CalendarSettings } from "../document/calendar-settings";
import { weekInfo } from "../locale/week-info";
import type { ViewState } from "../state/calendar-state";
import type { Weekday } from "../time/day-of-week";
import { fromEpochDay, toEpochDay } from "../time/epoch-day";
import { parsePlainDate } from "../time/parse-plain-date";

/** A range of epoch days, `end` exclusive. */
export interface DayRange {
    readonly start: number;
    readonly end: number;
}

/** The days of a view. */
export interface ViewDays {
    /** what the view is about (the month of a month view, the six weeks being `grid`) */
    readonly current: DayRange;
    /** the days laid out: whole weeks for a month view, else `current` */
    readonly grid: DayRange;
    /** the grid's days without its hidden edge days */
    readonly visible: DayRange;
}

/** The day of the week of an epoch day (day 0, 1970-01-01, was a Thursday). */
export function weekdayOf(epochDay: number): Weekday {
    return ((((epochDay + 4) % 7) + 7) % 7) as Weekday;
}

/** The first day of the week in effect: the setting, else the locale's. */
export function firstDayOf(settings: CalendarSettings): Weekday {
    return settings.firstDayOfWeek ?? weekInfo(settings.locale).firstDay;
}

/** The start of the week holding `day`. */
export function startOfWeek(day: number, firstDay: Weekday): number {
    return day - ((weekdayOf(day) - firstDay + 7) % 7);
}

/** Whether `day` is one of the hidden days of the week. */
export function isHidden(day: number, hiddenDays: readonly Weekday[]): boolean {
    return hiddenDays.length > 0 && hiddenDays.includes(weekdayOf(day));
}

/** `day`, or the first day after it (`step` 1) or before it (-1) that is not hidden. */
export function skipHidden(
    day: number,
    step: 1 | -1,
    hiddenDays: readonly Weekday[],
): number {
    let at = day;
    // settings never hide every day (`settings-issues.ts`), so this ends within a week
    while (isHidden(at, hiddenDays)) at += step;
    return at;
}

/** The first day of the month holding `day`. */
export function startOfMonth(day: number): number {
    const date = fromEpochDay(day);
    return toEpochDay({ year: date.year, month: date.month, day: 1 });
}

/** The first day of the month `months` after the month holding `day`. */
export function addMonthsTo(day: number, months: number): number {
    const date = fromEpochDay(day);
    return toEpochDay({ year: date.year, month: date.month + months, day: 1 });
}

/** The anchor date of a view as an epoch day. */
export function anchorOf(view: ViewState): number {
    const parsed = parsePlainDate(view.anchorDate);
    // a view in the state always has a valid anchor (load and commands check it)
    return parsed.ok ? toEpochDay(parsed.value) : 0;
}

function trimmed(range: DayRange, hiddenDays: readonly Weekday[]): DayRange {
    if (hiddenDays.length === 0) return range;
    let { start, end } = range;
    while (start < end && isHidden(start, hiddenDays)) start++;
    while (end > start && isHidden(end - 1, hiddenDays)) end--;
    return { start, end };
}

/** `count` days that are not hidden from `start` (itself not hidden): their range. */
function countVisible(
    start: number,
    count: number,
    hiddenDays: readonly Weekday[],
): DayRange {
    let end = start;
    for (let left = count; left > 0; end++) {
        if (!isHidden(end, hiddenDays)) left--;
    }
    return { start, end };
}

/** The days of a view under the settings. */
export function viewDays(
    view: ViewState,
    settings: CalendarSettings,
): ViewDays {
    const anchor = anchorOf(view);
    const hidden = settings.hiddenDays;
    const firstDay = firstDayOf(settings);
    switch (view.type) {
        case "month": {
            const current = {
                start: startOfMonth(anchor),
                end: addMonthsTo(anchor, 1),
            };
            const start = startOfWeek(current.start, firstDay);
            const end = settings.fixedWeekCount
                ? start + 42
                : startOfWeek(current.end - 1, firstDay) + 7;
            const grid = { start, end };
            return { current, grid, visible: trimmed(grid, hidden) };
        }
        case "week": {
            const start = startOfWeek(anchor, firstDay);
            const range = trimmed({ start, end: start + 7 }, hidden);
            return { current: range, grid: range, visible: range };
        }
        case "day": {
            const day = skipHidden(anchor, 1, hidden);
            const range = { start: day, end: day + 1 };
            return { current: range, grid: range, visible: range };
        }
        case "days": {
            const range = countVisible(
                skipHidden(anchor, 1, hidden),
                view.days ?? 1,
                hidden,
            );
            return { current: range, grid: range, visible: range };
        }
        case "list": {
            const range =
                view.duration === undefined
                    ? {
                          start: startOfMonth(anchor),
                          end: addMonthsTo(anchor, 1),
                      }
                    : { start: anchor, end: anchor + view.duration };
            const visible = trimmed(range, hidden);
            return { current: range, grid: range, visible };
        }
    }
}

/** The anchor a view's `next` (1) or `previous` (-1) step moves to: the view's own step. */
export function steppedAnchor(
    view: ViewState,
    settings: CalendarSettings,
    step: 1 | -1,
): number {
    const anchor = anchorOf(view);
    const hidden = settings.hiddenDays;
    switch (view.type) {
        case "month":
            return addMonthsTo(anchor, step);
        case "week":
            return startOfWeek(anchor, firstDayOf(settings)) + 7 * step;
        case "day":
            return skipHidden(
                skipHidden(anchor, 1, hidden) + step,
                step,
                hidden,
            );
        case "days": {
            const { current } = viewDays(view, settings);
            if (step === 1) return skipHidden(current.end, 1, hidden);
            // `days` days that are not hidden, back from the first one shown
            let start = current.start;
            for (let left = view.days ?? 1; left > 0; ) {
                start--;
                if (!isHidden(start, hidden)) left--;
            }
            return start;
        }
        case "list":
            return view.duration === undefined
                ? addMonthsTo(anchor, step)
                : anchor + view.duration * step;
    }
}
