// The view's title as data (D4): `Intl.DateTimeFormat#formatRangeToParts` parts in the settings'
// locale, over the days the view is about (in the display zone: they are its days). The app
// renders the parts; no primitive renders text (D19).
import type { FormatOptions } from "../locale/date-time-format";
import { formatDateRangeParts } from "../locale/format-date-range-parts";
import type { CalendarState } from "../state/calendar-state";
import { fromEpochDay } from "../time/epoch-day";
import type { ViewDays } from "../view/view-days";

/** The default format of a view's title: a month names its month, other views their days. */
function defaultFormat(state: CalendarState, days: ViewDays): FormatOptions {
    const { type, duration } = state.view;
    if (type === "month" || (type === "list" && duration === undefined)) {
        return { year: "numeric", month: "long" };
    }
    if (days.visible.end - days.visible.start === 1) {
        return { year: "numeric", month: "long", day: "numeric" };
    }
    return { year: "numeric", month: "short", day: "numeric" };
}

/**
 * The title of a view: a month view's month (`November 2026`), a week's or a `days` view's first
 * to last day (`Nov 22 – 28, 2026`), a day (`November 26, 2026`); `format` replaces the default.
 */
export function titleParts(
    state: CalendarState,
    days: ViewDays,
    format: FormatOptions | undefined,
): Intl.DateTimeRangeFormatPart[] {
    const { type, duration } = state.view;
    const range =
        type === "month" || (type === "list" && duration === undefined)
            ? days.current
            : days.visible;
    return formatDateRangeParts(
        { start: fromEpochDay(range.start), end: fromEpochDay(range.end) },
        state.settings.locale,
        format ?? defaultFormat(state, days),
    );
}
