// Events and calendars as the state holds them: a frozen copy with every field the JSON has, in one
// order (the document's, `event.add`'s and `calendar-json`'s), so a round trip is stable.
import { cloneJson } from "../state/clone-json";
import { deepFreeze } from "../state/deep-freeze";
import type { CalendarEventInit, CalendarInfoJson } from "./calendar-document";
import type { CalendarEvent, CalendarInfo } from "./calendar-event";

const EVENT_KEYS = [
    "kind",
    "title",
    "start",
    "end",
    "allDay",
    "timeZone",
    "calendarId",
    "editable",
    "startEditable",
    "durationEditable",
    "deletable",
    "recurrence",
    "data",
] as const;

const CALENDAR_KEYS = ["title", "editable", "visible", "data"] as const;

/** Copies the given keys of `from` that are not `undefined`, in their order. */
function pick(
    from: Readonly<Record<string, unknown>>,
    keys: readonly string[],
    into: Record<string, unknown>,
): Record<string, unknown> {
    for (const key of keys) {
        const value = from[key];
        if (value !== undefined) into[key] = cloneJson(value);
    }
    return into;
}

/** A frozen event of `fields` with its id. */
export function toEvent(
    fields: Readonly<Record<string, unknown>>,
    id: string,
): CalendarEvent {
    return deepFreeze(
        pick(fields, EVENT_KEYS, { id }),
    ) as unknown as CalendarEvent;
}

/** A frozen calendar of `fields` with its id. */
export function toCalendar(
    fields: Readonly<Record<string, unknown>>,
    id: string,
): CalendarInfo {
    return deepFreeze(
        pick(fields, CALENDAR_KEYS, { id }),
    ) as unknown as CalendarInfo;
}

/** An event as JSON: a writable copy. */
export function eventToJson(event: CalendarEvent): CalendarEventInit {
    return pick(
        event as unknown as Readonly<Record<string, unknown>>,
        EVENT_KEYS,
        {
            id: event.id,
        },
    ) as unknown as CalendarEventInit;
}

/** A calendar as JSON: a writable copy. */
export function calendarToJson(calendar: CalendarInfo): CalendarInfoJson {
    return pick(
        calendar as unknown as Readonly<Record<string, unknown>>,
        CALENDAR_KEYS,
        { id: calendar.id },
    ) as unknown as CalendarInfoJson;
}
