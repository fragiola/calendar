// The public entry of `@fragiola/calendar`: the framework-free core. Every opt-in feature has an
// entry of its own (`@fragiola/calendar/<feature>`) that this one never imports.

// validation
export type {
    ValidationIssue,
    ValidationResult,
} from "./document/validation-issue";

// locale: weeks, week numbers, `Intl` parts
export type { FormatOptions } from "./locale/date-time-format";
export { formatDateParts } from "./locale/format-date-parts";
export { formatDateRangeParts } from "./locale/format-date-range-parts";
export { formatInstantParts } from "./locale/format-instant-parts";
export { formatTimeParts } from "./locale/format-time-parts";
export { isWeekend } from "./locale/is-weekend";
export { isoWeekOfYear } from "./locale/iso-week-of-year";
export { validateLocale } from "./locale/validate-locale";
export { ISO_WEEK, type WeekInfo, weekInfo } from "./locale/week-info";
export {
    type WeekOfYear,
    type WeekRules,
    weekOfYear,
} from "./locale/week-of-year";
// time: plain dates and times, instants, RFC 3339
export { addDays } from "./time/add-days";
export { addMinutes } from "./time/add-minutes";
export { addMonths } from "./time/add-months";
export { comparePlainDates } from "./time/compare-plain-dates";
export type { DateRange } from "./time/date-range";
export { dateRangesOverlap } from "./time/date-ranges-overlap";
export { dayOfWeek, type Weekday } from "./time/day-of-week";
export { daysBetween } from "./time/days-between";
export { daysInMonth } from "./time/days-in-month";
export { formatDateTime } from "./time/format-date-time";
export { formatPlainDate } from "./time/format-plain-date";
export { formatPlainTime } from "./time/format-plain-time";
export { type Instant, instant } from "./time/instant";
export { isDateInRange } from "./time/is-date-in-range";
export { isPlainDate } from "./time/is-plain-date";
export { lastDateOfRange } from "./time/last-date-of-range";
export { minutesBetween } from "./time/minutes-between";
export { minutesOfDay } from "./time/minutes-of-day";
export type {
    DateTimeString,
    OffsetDateTime,
} from "./time/offset-date-time";
export { parseDateTime } from "./time/parse-date-time";
export { parsePlainDate } from "./time/parse-plain-date";
export { parsePlainTime } from "./time/parse-plain-time";
export type { PlainDate, PlainDateString } from "./time/plain-date";
export type { PlainTime, PlainTimeString } from "./time/plain-time";
export { timedDayRange } from "./time/timed-day-range";
export type { ZonedDateTimeFields } from "./time/zoned-date-time-fields";
// time zones: offsets, wall clock ↔ instant, DST
export { addDaysInZone } from "./time-zone/add-days-in-zone";
export { formatInstant } from "./time-zone/format-instant";
export { instantToWallClock } from "./time-zone/instant-to-wall-clock";
export { minutesInDay } from "./time-zone/minutes-in-day";
export { plainDateInZone } from "./time-zone/plain-date-in-zone";
export {
    LOCAL_TIME_ZONE,
    resolveTimeZone,
} from "./time-zone/resolve-time-zone";
export { startOfDay } from "./time-zone/start-of-day";
export { timeZoneOffset } from "./time-zone/time-zone-offset";
export { validateTimeZone } from "./time-zone/validate-time-zone";
export { wallClockToInstant } from "./time-zone/wall-clock-to-instant";
