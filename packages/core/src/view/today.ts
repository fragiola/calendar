// "Today" is the date of the injected clock's now in the display zone (D16): the model reads no
// other clock, so a test, a server and a client agree on it. Every read of the model asks for it,
// so each zone keeps the day it last answered with the instants that day spans: a now inside them
// is that day again, with no zone math.
import type { CalendarSettings } from "../document/calendar-settings";
import { fromEpochDay, toEpochDay } from "../time/epoch-day";
import { instant } from "../time/instant";
import { plainDateInZone } from "../time-zone/plain-date-in-zone";
import { resolveTimeZone } from "../time-zone/resolve-time-zone";
import { startOfDay } from "../time-zone/start-of-day";

/** A day of a zone and the instants it spans, `[from, to)`. */
interface ZoneDay {
    readonly day: number;
    readonly from: number;
    readonly to: number;
}

const days = new Map<string, ZoneDay>();
/** Zones kept before the cache starts over. */
const MAX_ZONES = 100;

/** Today, as an epoch day, in the settings' display zone. */
export function todayOf(settings: CalendarSettings, now: () => number): number {
    const at = Math.floor(now());
    const zone = resolveTimeZone(settings.timeZone);
    const known = days.get(zone);
    if (known && known.from <= at && at < known.to) return known.day;
    const day = toEpochDay(plainDateInZone(instant(at), zone));
    if (days.size >= MAX_ZONES) days.clear();
    days.set(zone, {
        day,
        from: startOfDay(fromEpochDay(day), zone),
        to: startOfDay(fromEpochDay(day + 1), zone),
    });
    return day;
}
