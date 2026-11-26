// Shared setup of the recurrence tests: a model with `recurrence()` whose display zone and event
// zone are America/New_York (RFC 5545's examples are written there), and a reader of the dates
// and wall-clock times of the occurrences over a range.
import type { CalendarEventJson, CalendarSettingsJson } from "../../src/index";
import { recurrence } from "../../src/recurrence/index";
import { modelOf } from "../fixture";

export const NEW_YORK = "America/New_York";

/** A timed recurring event at 09:00–10:00 New York time from `date`, by `rule`. */
export function series(
    id: string,
    date: string,
    rule: string,
    more: Partial<CalendarEventJson> = {},
): CalendarEventJson {
    const offset = new Intl.DateTimeFormat("en-US", {
        timeZone: NEW_YORK,
        timeZoneName: "longOffset",
    })
        .formatToParts(new Date(`${date}T14:00:00Z`))
        .find((part) => part.type === "timeZoneName")
        ?.value.replace("GMT", "");
    return {
        id,
        title: id,
        start: `${date}T09:00:00${offset}`,
        end: `${date}T10:00:00${offset}`,
        allDay: false,
        timeZone: NEW_YORK,
        recurrence: { rule },
        ...more,
    };
}

/** A model with `recurrence()` in New York (or `settings`). */
export function recurringModel(
    events: CalendarEventJson[],
    settings: CalendarSettingsJson = {},
) {
    return modelOf(
        events,
        { timeZone: NEW_YORK, ...settings },
        {},
        {
            features: [recurrence()],
        },
    );
}

/** The occurrences' starts over a range, as `YYYY-MM-DD HH:mm` on New York's wall clock. */
export function wallStarts(
    model: ReturnType<typeof recurringModel>,
    start: string,
    end: string,
): string[] {
    return model
        .get("occurrences-in", { range: { start, end } })
        .map((occurrence) => {
            const at = new Date(occurrence.start);
            const parts = new Intl.DateTimeFormat("en-CA", {
                timeZone: NEW_YORK,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
            }).formatToParts(at);
            const get = (type: string) =>
                parts.find((part) => part.type === type)?.value ?? "";
            return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
        });
}

/** The dates of `wallStarts`, each checked to be at 09:00. */
export function datesAt9(
    model: ReturnType<typeof recurringModel>,
    start: string,
    end: string,
): string[] {
    return wallStarts(model, start, end).map((text) => {
        if (!text.endsWith(" 09:00"))
            throw new Error(`${text} is not at 09:00`);
        return text.slice(0, 10);
    });
}
