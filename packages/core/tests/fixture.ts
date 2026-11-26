// Shared test setup: a model on a fixed clock (2026-11-26 12:00 UTC, a Thursday) in UTC, with
// events written briefly (`allDay("a", "2026-11-24", "2026-11-27")`, `timed("b", "09:00", "10:00")`
// on 2026-11-26), so each expectation reads as a calendar.
import {
    type CalendarDocument,
    type CalendarEventJson,
    type CalendarFeatures,
    type CalendarModelOptions,
    type CalendarSettingsJson,
    createCalendarModel,
} from "../src/index";

/** The fixed clock: 2026-11-26T12:00:00Z. */
export const NOW = Date.UTC(2026, 10, 26, 12);

/** An all-day event (end exclusive). */
export function allDay(
    id: string,
    start: string,
    end: string,
    more: Partial<CalendarEventJson> = {},
): CalendarEventJson {
    return { id, title: id, start, end, allDay: true, ...more };
}

/** A timed event: `HH:mm` times on `date` in UTC, or full RFC 3339 strings. */
export function timed(
    id: string,
    start: string,
    end: string,
    more: Partial<CalendarEventJson> & { date?: string } = {},
): CalendarEventJson {
    const { date = "2026-11-26", ...rest } = more;
    const full = (text: string) =>
        text.includes("T") ? text : `${date}T${text}:00Z`;
    return {
        id,
        title: id,
        start: full(start),
        end: full(end),
        allDay: false,
        ...rest,
    };
}

/** A document of events, in UTC with Sunday as the first day unless `settings` say otherwise. */
export function documentOf(
    events: CalendarEventJson[] = [],
    settings: CalendarSettingsJson = {},
    more: Partial<CalendarDocument> = {},
): CalendarDocument {
    return {
        version: 1,
        events,
        settings: { timeZone: "UTC", firstDayOfWeek: 0, ...settings },
        ...more,
    };
}

/** A model of a document on the fixed clock. */
export function modelOf<const F extends CalendarFeatures = readonly []>(
    events: CalendarEventJson[] = [],
    settings: CalendarSettingsJson = {},
    more: Partial<CalendarDocument> = {},
    options: CalendarModelOptions<F> = {},
) {
    return createCalendarModel(documentOf(events, settings, more), {
        now: () => NOW,
        ...options,
    });
}
