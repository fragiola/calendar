// `get("occurrences-in", { range })`: every occurrence that touches a range of days of the display
// zone, recurring events expanded, in event order (each event's by original start). Hidden
// calendars' events are left out, as the view leaves them out.
import type { CalendarEvent } from "../../document/calendar-event";
import { eventTimes } from "../../document/event-times";
import type { FeatureState } from "../../features/types";
import { eventOccurrences, type Occurrence } from "../../layout/occurrence";
import { toEpochDay } from "../../time/epoch-day";
import { parsePlainDate } from "../../time/parse-plain-date";
import { startOfDay } from "../../time-zone/start-of-day";
import { displayZoneOf } from "../edits/locate-occurrence";
import { seriesOf, windowOccurrences } from "./series";

const memo = new WeakMap<FeatureState, Map<string, readonly Occurrence[]>>();

/** The events the view would show: those of calendars not hidden. */
function shown(state: FeatureState): readonly CalendarEvent[] {
    const hidden = new Set(
        state.calendars
            .filter((calendar) => calendar.visible === false)
            .map((calendar) => calendar.id),
    );
    return hidden.size === 0
        ? state.events
        : state.events.filter(
              (event) =>
                  event.calendarId === undefined ||
                  !hidden.has(event.calendarId),
          );
}

/** The occurrences touching `range` (`YYYY-MM-DD` days, end exclusive); none for a bad range. */
export function occurrencesIn(
    state: FeatureState,
    range: { readonly start?: unknown; readonly end?: unknown } | undefined,
): readonly Occurrence[] {
    const start = parsePlainDate(range?.start);
    const end = parsePlainDate(range?.end);
    if (!start.ok || !end.ok) return Object.freeze([]);
    const zone = displayZoneOf(state);
    const key = `${zone} ${range?.start} ${range?.end}`;
    let cached = memo.get(state);
    const hit = cached?.get(key);
    if (hit) return hit;
    const firstDay = toEpochDay(start.value);
    const endDay = toEpochDay(end.value);
    const from = startOfDay(start.value, zone);
    const to = startOfDay(end.value, zone);
    const within = {
        range: { start: start.value, end: end.value },
        timeZone: zone,
    };
    const found: Occurrence[] = [];
    for (const event of shown(state)) {
        const series = event.recurrence ? seriesOf(event, zone) : null;
        const all = series
            ? windowOccurrences(series, within)
            : eventOccurrences(event);
        for (const occurrence of all) {
            const times = eventTimes(occurrence);
            if (!times) continue;
            const touches = times.allDay
                ? times.start < endDay && times.end > firstDay
                : times.start < to &&
                  (times.end > from ||
                      (times.end === times.start && times.start >= from));
            if (touches) found.push(occurrence);
        }
    }
    const list = Object.freeze(found);
    if (!cached) {
        cached = new Map();
        memo.set(state, cached);
    }
    cached.set(key, list);
    return list;
}
