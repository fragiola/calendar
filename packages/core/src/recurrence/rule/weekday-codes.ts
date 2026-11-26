// RFC 5545's two-letter weekdays, in `Weekday` order (0 = Sunday).
import type { Weekday } from "../../time/day-of-week";

/** `SU`…`SA`, by weekday. */
export const WEEKDAY_CODES = [
    "SU",
    "MO",
    "TU",
    "WE",
    "TH",
    "FR",
    "SA",
] as const;

/** The weekday of a two-letter code, or `undefined`. */
export function weekdayOfCode(code: string): Weekday | undefined {
    const at = (WEEKDAY_CODES as readonly string[]).indexOf(code);
    return at < 0 ? undefined : (at as Weekday);
}
