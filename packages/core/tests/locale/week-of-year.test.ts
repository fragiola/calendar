// Week numbers for every first day of the week around the 2020–2030 year boundaries. The table is
// worked by hand from the weekday of each January 1 (2020 Wed, 2021 Fri, 2022 Sat, 2023 Sun,
// 2024 Mon, 2025 Wed, 2026 Thu, 2027 Fri, 2028 Sat, 2029 Mon, 2030 Tue, 2031 Wed); the cases of
// Schedule-X's week-number fixes (ISO weeks for Monday, US weeks for Sunday) are among them.
// A brute-force count over every day of 2020–2030 backs the table for every rule.
import { describe, expect, it } from "vitest";
import { isoWeekOfYear } from "../../src/locale/iso-week-of-year";
import { weekOfYear } from "../../src/locale/week-of-year";
import type { Weekday } from "../../src/time/day-of-week";
import { date } from "../time/date-time-of";

// [first day, minimal days, date, week-year, week]
const HAND_COMPUTED: [Weekday, number, string, number, number][] = [
    // ISO 8601: Monday, 4
    [1, 4, "2020-12-31", 2020, 53],
    [1, 4, "2021-01-03", 2020, 53],
    [1, 4, "2021-01-04", 2021, 1],
    [1, 4, "2022-01-02", 2021, 52],
    [1, 4, "2023-01-01", 2022, 52],
    [1, 4, "2023-01-02", 2023, 1],
    [1, 4, "2024-01-01", 2024, 1],
    [1, 4, "2024-12-29", 2024, 52],
    [1, 4, "2024-12-30", 2025, 1],
    [1, 4, "2025-07-21", 2025, 30],
    [1, 4, "2025-12-28", 2025, 52],
    [1, 4, "2025-12-29", 2026, 1],
    [1, 4, "2026-11-26", 2026, 48],
    [1, 4, "2026-12-28", 2026, 53],
    [1, 4, "2027-01-03", 2026, 53],
    [1, 4, "2027-01-04", 2027, 1],
    [1, 4, "2028-01-02", 2027, 52],
    [1, 4, "2028-01-03", 2028, 1],
    [1, 4, "2029-12-31", 2030, 1],
    [1, 4, "2030-12-29", 2030, 52],
    [1, 4, "2030-12-30", 2031, 1],
    // US: Sunday, 1 (week 1 holds January 1)
    [0, 1, "2021-12-31", 2022, 1],
    [0, 1, "2022-01-01", 2022, 1],
    [0, 1, "2022-01-02", 2022, 2],
    [0, 1, "2022-12-31", 2022, 53],
    [0, 1, "2023-01-01", 2023, 1],
    [0, 1, "2024-12-28", 2024, 52],
    [0, 1, "2024-12-29", 2025, 1],
    [0, 1, "2025-12-27", 2025, 52],
    [0, 1, "2025-12-28", 2026, 1],
    [0, 1, "2026-11-26", 2026, 48],
    [0, 1, "2028-12-30", 2028, 53],
    // Sunday with 4 minimal days: week 1 holds the first Wednesday
    [0, 4, "2022-01-01", 2021, 52],
    [0, 4, "2022-01-02", 2022, 1],
    [0, 4, "2026-01-03", 2025, 53],
    // Saturday, 1 (Arabic locales)
    [6, 1, "2021-12-31", 2021, 53],
    [6, 1, "2022-01-01", 2022, 1],
    [6, 1, "2027-12-31", 2027, 53],
    [6, 1, "2028-01-01", 2028, 1],
    // Tuesday, 4
    [2, 4, "2025-12-29", 2025, 52],
    [2, 4, "2025-12-30", 2026, 1],
    [2, 4, "2024-12-31", 2025, 1],
    // Wednesday, 4
    [3, 4, "2026-12-29", 2026, 52],
    [3, 4, "2026-12-30", 2027, 1],
    [3, 4, "2025-12-31", 2026, 1],
    // Thursday, 1
    [4, 1, "2020-12-30", 2020, 53],
    [4, 1, "2020-12-31", 2021, 1],
    // Friday, 4
    [5, 4, "2027-12-30", 2027, 52],
    [5, 4, "2027-12-31", 2028, 1],
    [5, 4, "2027-01-01", 2027, 1],
];

describe("week numbers", () => {
    it.each(HAND_COMPUTED)(
        "first day %i, %i minimal days: %s is week %i-W%i",
        (firstDay, minimalDays, text, year, week) => {
            expect(weekOfYear(date(text), { firstDay, minimalDays })).toEqual({
                year,
                week,
            });
        },
    );

    it("ISO numbers ignore the locale", () => {
        expect(isoWeekOfYear(date("2021-01-03"))).toEqual({
            year: 2020,
            week: 53,
        });
        expect(isoWeekOfYear(date("2029-12-31"))).toEqual({
            year: 2030,
            week: 1,
        });
    });

    // about 200,000 days compared: by hand, one assertion at the end (an `expect` a day took over a
    // second, and timed out once under the full suite's load)
    it("agree with a day-by-day count for every rule and every day of 2020–2030", () => {
        const DAY = 86_400_000;
        const mismatches: string[] = [];
        for (let firstDay = 0; firstDay <= 6; firstDay++) {
            for (let minimalDays = 1; minimalDays <= 7; minimalDays++) {
                // walk the days, starting a new week on each first day and a new week-year on the
                // first week holding `minimalDays` days of a year
                let weekYear = 0;
                let week = 0;
                const start = Date.UTC(2019, 11, 1);
                // align to the first `firstDay` on or after start
                let day = start;
                while (new Date(day).getUTCDay() !== firstDay) {
                    day += DAY;
                }
                for (; day < Date.UTC(2031, 0, 31); day += 7 * DAY) {
                    const years = Array.from({ length: 7 }, (_, i) =>
                        new Date(day + i * DAY).getUTCFullYear(),
                    );
                    const last = years[6] ?? 0;
                    const daysOfLast = years.filter((y) => y === last).length;
                    if (daysOfLast >= minimalDays && last !== weekYear) {
                        weekYear = last;
                        week = 1;
                    } else {
                        week++;
                    }
                    if (weekYear === 0 || day < Date.UTC(2020, 0, 1)) {
                        continue;
                    }
                    for (let i = 0; i < 7; i++) {
                        const utc = new Date(day + i * DAY);
                        const plain = {
                            year: utc.getUTCFullYear(),
                            month: utc.getUTCMonth() + 1,
                            day: utc.getUTCDate(),
                        };
                        if (plain.year > 2030) {
                            continue;
                        }
                        const got = weekOfYear(plain, {
                            firstDay: firstDay as Weekday,
                            minimalDays,
                        });
                        if (got.year !== weekYear || got.week !== week) {
                            mismatches.push(
                                `${firstDay}/${minimalDays} ${utc.toISOString().slice(0, 10)}: ${got.year}-W${got.week}, counted ${weekYear}-W${week}`,
                            );
                        }
                    }
                }
            }
        }
        expect(mismatches).toEqual([]);
    });
});
