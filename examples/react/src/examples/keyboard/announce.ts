// The live region's text, from the engine's announcements (data, never text: the words and the
// language are the app's). Each one names the event and where it would land, or, for PageUp and
// PageDown, the range now shown and the focused slot (its element may be the one focused before,
// with a new date: no focus event says it).
import type {
    Announcement,
    CalendarModel,
    CalendarTypes,
} from "@fragiola/calendar-react";
import { dateTimeFormat, titleOf } from "../_kit/format";

function when<T extends CalendarTypes>(
    model: CalendarModel<T>,
    times: { start: string; end: string; allDay: boolean },
): string {
    const { locale, timeZone } = model.state.settings;
    const zone = timeZone === "local" ? undefined : timeZone;
    if (times.allDay) {
        return dateTimeFormat(locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "UTC",
        }).format(Date.parse(`${times.start}T00:00:00Z`));
    }
    return dateTimeFormat(locale, {
        weekday: "long",
        hour: "numeric",
        minute: "2-digit",
        timeZone: zone,
    }).formatRange(Date.parse(times.start), Date.parse(times.end));
}

const DAY = 86_400_000;

/** A range of days (`end` exclusive): a whole month as its month, else its first and last days. */
function days<T extends CalendarTypes>(
    model: CalendarModel<T>,
    range: { start: string; end: string },
): string {
    const { locale } = model.state.settings;
    const start = Date.parse(`${range.start}T00:00:00Z`);
    const end = Date.parse(`${range.end}T00:00:00Z`);
    if (range.start.endsWith("-01") && range.end.endsWith("-01")) {
        return dateTimeFormat(locale, {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
        }).format(start);
    }
    return dateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).formatRange(start, Math.max(start, end - DAY));
}

/** A focused day, or a slot's wall-clock start on its day. */
function cell<T extends CalendarTypes>(
    model: CalendarModel<T>,
    focused: { date: string; time?: string },
): string {
    return dateTimeFormat(model.state.settings.locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        ...(focused.time ? { hour: "numeric", minute: "2-digit" } : {}),
        timeZone: "UTC",
    }).format(Date.parse(`${focused.date}T${focused.time ?? "00:00"}:00Z`));
}

/** What the live region says for an announcement. */
export function announcementText<T extends CalendarTypes>(
    model: CalendarModel<T>,
    announcement: Announcement,
): string {
    const title = (occurrenceId: string | null) => {
        if (!occurrenceId) return "The event";
        const occurrence = model.get("occurrence-by", { id: occurrenceId });
        return occurrence
            ? titleOf(model, occurrenceId, occurrence.eventId)
            : "The event";
    };
    switch (announcement.kind) {
        case "grab":
            return `${title(announcement.occurrenceId)} grabbed. Arrows move it, Shift and arrows resize it, Enter drops it, Escape cancels.`;
        case "drag-over":
            return announcement.preview
                ? `${when(model, announcement.preview)}.`
                : "It cannot go there.";
        case "drop":
            return `${title(announcement.occurrenceId)} moved to ${when(model, announcement.preview)}.`;
        case "drag-cancel":
            return `${title(announcement.occurrenceId)} left where it was.`;
        case "select-extend":
            return announcement.range
                ? `Selected ${when(model, announcement.range)}. Enter confirms.`
                : "That range cannot be selected.";
        case "range":
            return `${days(model, announcement.range)}. ${cell(model, announcement.focused)}.`;
    }
}
