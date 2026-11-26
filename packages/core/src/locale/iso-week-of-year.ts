import type { PlainDate } from "../time/plain-date";
import { ISO_WEEK } from "./week-info";
import { type WeekOfYear, weekOfYear } from "./week-of-year";

/** The ISO 8601 week number of a date (`weekNumbers: "iso"`), whatever the locale. */
export function isoWeekOfYear(date: PlainDate): WeekOfYear {
    return weekOfYear(date, ISO_WEEK);
}
