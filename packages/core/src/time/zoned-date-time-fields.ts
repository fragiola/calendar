import type { PlainDate } from "./plain-date";

/**
 * A wall-clock date and time as a zone shows it, with no offset. It is a `PlainDate` too, so its
 * date passes wherever a date is expected.
 */
export interface ZonedDateTimeFields extends PlainDate {
    readonly hour: number;
    readonly minute: number;
    readonly second: number;
    readonly millisecond: number;
}
