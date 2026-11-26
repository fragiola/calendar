import { addDays } from "../time/add-days";
import type { PlainDate } from "../time/plain-date";
import { startOfDay } from "./start-of-day";

/**
 * How long a date lasts in a zone, in minutes: 1440 usually, 1380 or 1500 on a DST change, 1410 or
 * 1470 on Lord Howe's, 0 for a skipped day. Never assume 1440 (D4).
 */
export function minutesInDay(date: PlainDate, timeZone: string): number {
    return (
        (startOfDay(addDays(date, 1), timeZone) - startOfDay(date, timeZone)) /
        60_000
    );
}
