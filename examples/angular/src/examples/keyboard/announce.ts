// The live region's text, from the engine's announcements (data, never text: the words and the
// language are the app's). Each one names the event and where it would land.
import type {
    Announcement,
    CalendarModel,
    CalendarTypes,
} from "@fragiola/calendar-angular";
import { titleOf } from "../_kit/format";

function when<T extends CalendarTypes>(
    model: CalendarModel<T>,
    times: { start: string; end: string; allDay: boolean },
): string {
    const { locale, timeZone } = model.state.settings;
    const zone = timeZone === "local" ? undefined : timeZone;
    if (times.allDay) {
        return new Intl.DateTimeFormat(locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "UTC",
        }).format(Date.parse(`${times.start}T00:00:00Z`));
    }
    return new Intl.DateTimeFormat(locale, {
        weekday: "long",
        hour: "numeric",
        minute: "2-digit",
        timeZone: zone,
    }).formatRange(Date.parse(times.start), Date.parse(times.end));
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
    }
}
