import { pad } from "./pad";
import type { PlainTime, PlainTimeString } from "./plain-time";

/** A time of day as `HH:mm`. */
export function formatPlainTime(time: PlainTime): PlainTimeString {
    return `${pad(time.hour, 2)}:${pad(time.minute, 2)}`;
}
