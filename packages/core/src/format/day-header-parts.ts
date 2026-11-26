// A day's header as data (D4): `Intl.DateTimeFormat` parts in the settings' locale. A month
// view's column header names the weekday (`Thu`); a time grid's names the weekday and the day
// (`Thu 26`).
import type { FormatOptions } from "../locale/date-time-format";
import { formatDateParts } from "../locale/format-date-parts";
import type { CalendarState } from "../state/calendar-state";
import { parsePlainDate } from "../time/parse-plain-date";

/** A day's header parts (`format` replaces the view's default), or `undefined` for no date. */
export function dayHeaderParts(
    state: CalendarState,
    date: unknown,
    format: FormatOptions | undefined,
): Intl.DateTimeFormatPart[] | undefined {
    const parsed = parsePlainDate(date);
    if (!parsed.ok) return undefined;
    const type = state.view.type;
    return formatDateParts(
        parsed.value,
        state.settings.locale,
        format ??
            (type === "month" || type === "list"
                ? { weekday: "short" }
                : { weekday: "short", day: "numeric" }),
    );
}
