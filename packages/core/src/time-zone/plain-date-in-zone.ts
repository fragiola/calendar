import type { Instant } from "../time/instant";
import type { PlainDate } from "../time/plain-date";
import { instantToWallClock } from "./instant-to-wall-clock";

/** The date a zone shows at an instant ("today" is the date of now in the display zone). */
export function plainDateInZone(at: Instant, timeZone: string): PlainDate {
    const { year, month, day } = instantToWallClock(at, timeZone);
    return { year, month, day };
}
