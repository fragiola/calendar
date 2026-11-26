// Plain dates as a count of days since 1970-01-01 (the epoch day), on the proleptic Gregorian
// calendar, with integer arithmetic only: no `Date`, so no host zone and no two-digit-year quirks.
// The conversion counts in 400-year cycles (146 097 days) of years that start on March 1, so the
// leap day is the last day of its year. Fields overflow into the next unit (month 13, day 0).
import type { PlainDate } from "./plain-date";

const DAYS_PER_CYCLE = 146_097;
/** Days from 0000-03-01 to 1970-01-01. */
const EPOCH_SHIFT = 719_468;

/** The epoch day of a date (1970-01-01 is 0); out-of-range months and days overflow. */
export function toEpochDay(date: PlainDate): number {
    const monthIndex = date.month - 1;
    const year = date.year + Math.floor(monthIndex / 12);
    const month = monthIndex - Math.floor(monthIndex / 12) * 12 + 1;
    // years start on March 1: January and February belong to the previous one
    const marchYear = month <= 2 ? year - 1 : year;
    const cycle = Math.floor(marchYear / 400);
    const yearOfCycle = marchYear - cycle * 400;
    const monthFromMarch = (month + 9) % 12;
    const dayOfYear = Math.floor((153 * monthFromMarch + 2) / 5) + date.day - 1;
    const dayOfCycle =
        yearOfCycle * 365 +
        Math.floor(yearOfCycle / 4) -
        Math.floor(yearOfCycle / 100) +
        dayOfYear;
    return cycle * DAYS_PER_CYCLE + dayOfCycle - EPOCH_SHIFT;
}

/** The date of an epoch day. */
export function fromEpochDay(epochDay: number): PlainDate {
    const shifted = epochDay + EPOCH_SHIFT;
    const cycle = Math.floor(shifted / DAYS_PER_CYCLE);
    const dayOfCycle = shifted - cycle * DAYS_PER_CYCLE;
    const yearOfCycle = Math.floor(
        (dayOfCycle -
            Math.floor(dayOfCycle / 1460) +
            Math.floor(dayOfCycle / 36_524) -
            Math.floor(dayOfCycle / 146_096)) /
            365,
    );
    const dayOfYear =
        dayOfCycle -
        (365 * yearOfCycle +
            Math.floor(yearOfCycle / 4) -
            Math.floor(yearOfCycle / 100));
    const monthFromMarch = Math.floor((5 * dayOfYear + 2) / 153);
    const day = dayOfYear - Math.floor((153 * monthFromMarch + 2) / 5) + 1;
    const month = monthFromMarch < 10 ? monthFromMarch + 3 : monthFromMarch - 9;
    const year = cycle * 400 + yearOfCycle + (month <= 2 ? 1 : 0);
    return { year, month, day };
}
