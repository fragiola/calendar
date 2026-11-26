import { describe, expect, it } from "vitest";
import { addDays } from "../../src/time/add-days";
import { addMonths } from "../../src/time/add-months";
import { comparePlainDates } from "../../src/time/compare-plain-dates";
import { dayOfWeek } from "../../src/time/day-of-week";
import { daysBetween } from "../../src/time/days-between";
import { daysInMonth } from "../../src/time/days-in-month";
import { fromEpochDay, toEpochDay } from "../../src/time/epoch-day";
import { formatPlainDate } from "../../src/time/format-plain-date";
import { isPlainDate } from "../../src/time/is-plain-date";
import { parsePlainDate } from "../../src/time/parse-plain-date";
import { date } from "./date-time-of";

describe("epoch days", () => {
    it("agree with Date.UTC every day from 1900 to 2100, both ways", () => {
        const first = Date.UTC(1900, 0, 1) / 86_400_000;
        const last = Date.UTC(2100, 11, 31) / 86_400_000;
        for (let epochDay = first; epochDay <= last; epochDay++) {
            const utc = new Date(epochDay * 86_400_000);
            const expected = {
                year: utc.getUTCFullYear(),
                month: utc.getUTCMonth() + 1,
                day: utc.getUTCDate(),
            };
            expect(fromEpochDay(epochDay)).toEqual(expected);
            expect(toEpochDay(expected)).toBe(epochDay);
        }
    });

    it("count from 1970-01-01, before it too, and carry overflowing fields", () => {
        expect(toEpochDay(date("1970-01-01"))).toBe(0);
        expect(toEpochDay(date("1969-12-31"))).toBe(-1);
        expect(toEpochDay(date("0000-03-01"))).toBe(-719_468);
        expect(
            fromEpochDay(toEpochDay({ year: 2026, month: 13, day: 1 })),
        ).toEqual(date("2027-01-01"));
        expect(
            fromEpochDay(toEpochDay({ year: 2026, month: 3, day: 0 })),
        ).toEqual(date("2026-02-28"));
    });
});

describe("plain dates", () => {
    it("know the days of each month, leap years included", () => {
        expect(daysInMonth(2026, 2)).toBe(28);
        expect(daysInMonth(2024, 2)).toBe(29);
        expect(daysInMonth(2100, 2)).toBe(28);
        expect(daysInMonth(2000, 2)).toBe(29);
        expect([4, 6, 9, 11].map((month) => daysInMonth(2026, month))).toEqual([
            30, 30, 30, 30,
        ]);
        expect(daysInMonth(2026, 12)).toBe(31);
    });

    it("give the day of the week, 0 = Sunday", () => {
        expect(dayOfWeek(date("2026-11-26"))).toBe(4);
        expect(dayOfWeek(date("1970-01-01"))).toBe(4);
        expect(dayOfWeek(date("1969-12-28"))).toBe(0);
        expect(dayOfWeek(date("2000-01-01"))).toBe(6);
        expect(dayOfWeek(date("2024-01-01"))).toBe(1);
    });

    it("add days across months, years and leap days", () => {
        expect(addDays(date("2026-11-26"), 5)).toEqual(date("2026-12-01"));
        expect(addDays(date("2026-12-31"), 1)).toEqual(date("2027-01-01"));
        expect(addDays(date("2024-02-28"), 1)).toEqual(date("2024-02-29"));
        expect(addDays(date("2024-03-01"), -1)).toEqual(date("2024-02-29"));
        expect(addDays(date("2026-11-26"), 0)).toEqual(date("2026-11-26"));
    });

    it("add months, clamping the day to the month's end", () => {
        expect(addMonths(date("2026-01-31"), 1)).toEqual(date("2026-02-28"));
        expect(addMonths(date("2024-01-31"), 1)).toEqual(date("2024-02-29"));
        expect(addMonths(date("2024-02-29"), 12)).toEqual(date("2025-02-28"));
        expect(addMonths(date("2026-03-31"), -1)).toEqual(date("2026-02-28"));
        expect(addMonths(date("2026-01-15"), -13)).toEqual(date("2024-12-15"));
        expect(addMonths(date("2026-11-30"), 2)).toEqual(date("2027-01-30"));
    });

    it("count the days between two dates, and compare them", () => {
        expect(daysBetween(date("2026-11-26"), date("2026-12-25"))).toBe(29);
        expect(daysBetween(date("2026-12-25"), date("2026-11-26"))).toBe(-29);
        expect(daysBetween(date("2024-01-01"), date("2025-01-01"))).toBe(366);
        expect(
            comparePlainDates(date("2026-11-26"), date("2026-11-27")),
        ).toBeLessThan(0);
        expect(
            comparePlainDates(date("2026-12-01"), date("2026-11-30")),
        ).toBeGreaterThan(0);
        expect(comparePlainDates(date("2026-11-26"), date("2026-11-26"))).toBe(
            0,
        );
    });

    it("are real dates only", () => {
        expect(isPlainDate(date("2024-02-29"))).toBe(true);
        expect(isPlainDate(date("2026-02-29"))).toBe(false);
        expect(isPlainDate({ year: 2026, month: 0, day: 1 })).toBe(false);
        expect(isPlainDate({ year: 2026, month: 1.5, day: 1 })).toBe(false);
        expect(isPlainDate({ year: 10_000, month: 1, day: 1 })).toBe(false);
        expect(isPlainDate(null)).toBe(false);
        expect(isPlainDate("2026-11-26")).toBe(false);
    });
});

describe("YYYY-MM-DD", () => {
    it("round-trips", () => {
        for (const text of [
            "2026-11-26",
            "2024-02-29",
            "0001-01-01",
            "9999-12-31",
            "1969-07-20",
        ]) {
            const result = parsePlainDate(text);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(formatPlainDate(result.value)).toBe(text);
            }
        }
        expect(formatPlainDate({ year: 33, month: 4, day: 3 })).toBe(
            "0033-04-03",
        );
    });

    it("accepts a PlainDate object, as the primitives' date picker gives it (D5)", () => {
        expect(parsePlainDate({ year: 2026, month: 11, day: 26 })).toEqual({
            ok: true,
            value: date("2026-11-26"),
        });
    });

    it("returns an issue at the field's path for anything else, never throws", () => {
        for (const value of [
            "2026-11-26T00:00:00Z",
            "2026-2-3",
            "26-11-2026",
            "2026/11/26",
            " 2026-11-26",
            "2026-11-26 ",
            "2026-02-30",
            "2026-13-01",
            "2026-00-10",
            "+2026-11-26",
            "",
            { year: 2026, month: 2, day: 30 },
            { year: "2026", month: 11, day: 26 },
            null,
            undefined,
            20261126,
            [],
        ]) {
            const result = parsePlainDate(value, "/events/0/start");
            expect(result.ok, JSON.stringify(value)).toBe(false);
            if (!result.ok) {
                expect(result.issues).toHaveLength(1);
                expect(result.issues[0]?.path).toBe("/events/0/start");
                expect(result.issues[0]?.message).toMatch(/date/);
            }
        }
    });
});
