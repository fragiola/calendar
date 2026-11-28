// Text from data: the calendar gives dates and titles as data (`Intl` parts, model fields) and
// never renders them; these helpers are the app's own formatting. No calendar assembly.
import {
    type CalendarModel,
    type CalendarTypes,
    resolveTimeZone,
} from "@fragiola/calendar-angular";

/** Every formatter built so far, by locale and options: building one costs far more than using it. */
const FORMATTERS = new Map<string, Intl.DateTimeFormat>();

/**
 * An `Intl.DateTimeFormat` for a locale and options, built once and kept: an event's times are
 * formatted on every render of every event, and a drop renders several. No zone is the host's,
 * named as the calendar reads it (`resolveTimeZone("local")`, read again when the engine finds it
 * changed), so a kept formatter never shows a zone the host has left.
 */
export function dateTimeFormat(
    locale: string | undefined,
    options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
    const zoned = {
        ...options,
        timeZone: resolveTimeZone(options.timeZone ?? "local"),
    };
    const key = `${locale ?? ""} ${JSON.stringify(zoned)}`;
    let format = FORMATTERS.get(key);
    if (!format) {
        format = new Intl.DateTimeFormat(locale, zoned);
        FORMATTERS.set(key, format);
    }
    return format;
}

/** `Intl` parts as one string. */
export function text(parts: readonly { value: string }[]): string {
    return parts.map((part) => part.value).join("");
}

/** An occurrence's title: its own when renamed alone, else its event's. */
export function titleOf<T extends CalendarTypes>(
    model: CalendarModel<T>,
    occurrenceId: string,
    eventId: string,
): string {
    const occurrence = model.get("occurrence-by", { id: occurrenceId });
    return (
        occurrence?.title ?? model.get("event-by", { id: eventId })?.title ?? ""
    );
}

/** An occurrence's start and end as wall-clock times in the display zone (`9:00 – 10:30 AM`). */
export function timesOf<T extends CalendarTypes>(
    model: CalendarModel<T>,
    occurrenceId: string,
): string {
    const occurrence = model.get("occurrence-by", { id: occurrenceId });
    if (!occurrence || occurrence.allDay) return "";
    const { locale, timeZone } = model.state.settings;
    const format = dateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
        timeZone: timeZone === "local" ? undefined : timeZone,
    });
    return format.formatRange(
        Date.parse(occurrence.start),
        Date.parse(occurrence.end),
    );
}

/** A day (`YYYY-MM-DD`) in words, for a screen reader's label or a popover's heading. */
export function dayText(date: string, locale: string): string {
    const [year, month, dayOfMonth] = date.split("-").map(Number);
    return dateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    }).format(Date.UTC(year ?? 1970, (month ?? 1) - 1, dayOfMonth ?? 1));
}
