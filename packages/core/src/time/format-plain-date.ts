import { pad } from "./pad";
import type { PlainDate, PlainDateString } from "./plain-date";

/** A plain date as `YYYY-MM-DD`. */
export function formatPlainDate(date: PlainDate): PlainDateString {
    return `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`;
}
