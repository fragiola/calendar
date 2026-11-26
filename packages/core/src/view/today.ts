// "Today" is the date of the injected clock's now in the display zone (D16): the model reads no
// other clock, so a test, a server and a client agree on it.
import type { CalendarSettings } from "../document/calendar-settings";
import { toEpochDay } from "../time/epoch-day";
import { instant } from "../time/instant";
import { plainDateInZone } from "../time-zone/plain-date-in-zone";
import { resolveTimeZone } from "../time-zone/resolve-time-zone";

/** Today, as an epoch day, in the settings' display zone. */
export function todayOf(settings: CalendarSettings, now: () => number): number {
    return toEpochDay(
        plainDateInZone(
            instant(Math.floor(now())),
            resolveTimeZone(settings.timeZone),
        ),
    );
}
