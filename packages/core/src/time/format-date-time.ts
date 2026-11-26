import type { Instant } from "./instant";
import type { DateTimeString } from "./offset-date-time";
import { pad } from "./pad";
import { epochToWallClock } from "./wall-clock-epoch";

/**
 * An instant as RFC 3339 at an offset (minutes east of UTC, `Z` when 0): seconds always,
 * milliseconds only when not zero. A year outside 0000–9999 is a `RangeError`.
 */
export function formatDateTime(at: Instant, offset: number): DateTimeString {
    const wall = epochToWallClock(at + offset * 60_000);
    if (wall.year < 0 || wall.year > 9999 || !Number.isInteger(offset)) {
        throw new RangeError(
            `${at} at offset ${offset} has no RFC 3339 form (years 0000–9999, whole minutes)`,
        );
    }
    const date = `${pad(wall.year, 4)}-${pad(wall.month, 2)}-${pad(wall.day, 2)}`;
    const time = `${pad(wall.hour, 2)}:${pad(wall.minute, 2)}:${pad(wall.second, 2)}`;
    const fraction =
        wall.millisecond === 0 ? "" : `.${pad(wall.millisecond, 3)}`;
    const size = Math.abs(offset);
    const zone =
        offset === 0
            ? "Z"
            : `${offset < 0 ? "-" : "+"}${pad(Math.floor(size / 60), 2)}:${pad(size % 60, 2)}`;
    return `${date}T${time}${fraction}${zone}`;
}
