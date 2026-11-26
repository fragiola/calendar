import { dayOfWeek } from "../time/day-of-week";
import type { PlainDate } from "../time/plain-date";
import type { WeekInfo } from "./week-info";

/** Whether a date falls on the week's weekend. */
export function isWeekend(date: PlainDate, week: WeekInfo): boolean {
    return week.weekend.includes(dayOfWeek(date));
}
