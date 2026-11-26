import type { Instant } from "../time/instant";
import { epochToWallClock } from "../time/wall-clock-epoch";
import type { ZonedDateTimeFields } from "../time/zoned-date-time-fields";
import { offsetMilliseconds } from "./time-zone-offset";

/** The wall clock a zone shows at an instant. */
export function instantToWallClock(
    at: Instant,
    timeZone: string,
): ZonedDateTimeFields {
    return epochToWallClock(at + offsetMilliseconds(timeZone, at));
}
