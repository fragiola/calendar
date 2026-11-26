import type { Instant } from "./instant";

/** The exact duration from `start` to `end` in minutes (negative when `end` comes first). */
export function minutesBetween(start: Instant, end: Instant): number {
    return (end - start) / 60_000;
}
