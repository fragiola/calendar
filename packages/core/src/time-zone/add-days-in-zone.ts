import { addDays } from "../time/add-days";
import type { Instant } from "../time/instant";
import { instantToWallClock } from "./instant-to-wall-clock";
import { wallClockToInstant } from "./wall-clock-to-instant";

/**
 * The instant `days` whole days after `at` on the zone's wall clock: 09:00 stays 09:00 across a
 * DST change (D4), so the exact distance may be 23 or 25 hours. A wall clock the target day skips
 * moves past the gap, a repeated one takes the earlier instant (`"compatible"`).
 */
export function addDaysInZone(
    at: Instant,
    days: number,
    timeZone: string,
): Instant {
    if (days === 0) {
        return at;
    }
    const wall = instantToWallClock(at, timeZone);
    return wallClockToInstant({ ...wall, ...addDays(wall, days) }, timeZone);
}
