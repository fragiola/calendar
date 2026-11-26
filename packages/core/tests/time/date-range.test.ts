import { describe, expect, it } from "vitest";
import { dateRangesOverlap } from "../../src/time/date-ranges-overlap";
import { isDateInRange } from "../../src/time/is-date-in-range";
import { lastDateOfRange } from "../../src/time/last-date-of-range";
import { timedDayRange } from "../../src/time/timed-day-range";
import { date, wall } from "./date-time-of";

const range = (start: string, end: string) => ({
    start: date(start),
    end: date(end),
});

describe("exclusive ends (D4)", () => {
    it("exclude a range's end day", () => {
        const week = range("2026-11-22", "2026-11-29");
        expect(isDateInRange(date("2026-11-22"), week)).toBe(true);
        expect(isDateInRange(date("2026-11-28"), week)).toBe(true);
        expect(isDateInRange(date("2026-11-29"), week)).toBe(false);
        expect(isDateInRange(date("2026-11-21"), week)).toBe(false);
        expect(lastDateOfRange(week)).toEqual(date("2026-11-28"));
        // a one-day all-day event ends the next day
        expect(lastDateOfRange(range("2026-12-31", "2027-01-01"))).toEqual(
            date("2026-12-31"),
        );
    });

    it("do not overlap ranges that only touch", () => {
        expect(
            dateRangesOverlap(
                range("2026-11-22", "2026-11-29"),
                range("2026-11-29", "2026-12-06"),
            ),
        ).toBe(false);
        expect(
            dateRangesOverlap(
                range("2026-11-22", "2026-11-29"),
                range("2026-11-28", "2026-11-30"),
            ),
        ).toBe(true);
        expect(
            dateRangesOverlap(
                range("2026-11-01", "2026-12-01"),
                range("2026-11-10", "2026-11-11"),
            ),
        ).toBe(true);
    });
});

describe("nextDayThreshold", () => {
    it("with the default (00:00) shows any end after midnight on the next day, not one at midnight", () => {
        expect(
            timedDayRange(wall("2026-11-26T22:00"), wall("2026-11-27T00:00")),
        ).toEqual(range("2026-11-26", "2026-11-27"));
        expect(
            timedDayRange(wall("2026-11-26T22:00"), wall("2026-11-27T00:30")),
        ).toEqual(range("2026-11-26", "2026-11-28"));
    });

    it("keeps an end before the threshold off the next day", () => {
        const nineAm = 9 * 60;
        expect(
            timedDayRange(
                wall("2026-11-26T22:00"),
                wall("2026-11-27T08:59"),
                nineAm,
            ),
        ).toEqual(range("2026-11-26", "2026-11-27"));
        expect(
            timedDayRange(
                wall("2026-11-26T22:00"),
                wall("2026-11-27T09:00"),
                nineAm,
            ),
        ).toEqual(range("2026-11-26", "2026-11-28"));
        expect(
            timedDayRange(
                wall("2026-11-24T10:00"),
                wall("2026-11-27T02:00"),
                nineAm,
            ),
        ).toEqual(range("2026-11-24", "2026-11-27"));
    });

    it("always shows an occurrence on the day it starts", () => {
        expect(
            timedDayRange(
                wall("2026-11-26T10:00"),
                wall("2026-11-26T11:00"),
                12 * 60,
            ),
        ).toEqual(range("2026-11-26", "2026-11-27"));
        // zero-length, at midnight
        expect(
            timedDayRange(wall("2026-11-26T00:00"), wall("2026-11-26T00:00")),
        ).toEqual(range("2026-11-26", "2026-11-27"));
    });
});
