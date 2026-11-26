import type { PlainTime } from "./plain-time";

/** The minutes from midnight to a time of day, on the wall clock (`09:30` is 570, `24:00` 1440). */
export function minutesOfDay(time: PlainTime): number {
    return time.hour * 60 + time.minute;
}
