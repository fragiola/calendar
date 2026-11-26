// Wall clock ↔ instant over whole years, against `Intl` read independently: every half hour of
// each D4 zone's DST years shows the wall clock `Intl` shows, and that wall clock resolves back to
// the same instant, except the second pass of an overlap, which resolves to the first.
import { describe, expect, it } from "vitest";
import type { Instant } from "../../src/time/instant";
import { instantToWallClock } from "../../src/time-zone/instant-to-wall-clock";
import { plainDateInZone } from "../../src/time-zone/plain-date-in-zone";
import { timeZoneOffset } from "../../src/time-zone/time-zone-offset";
import { wallClockToInstant } from "../../src/time-zone/wall-clock-to-instant";
import { at } from "../time/date-time-of";

// zone, year (scanned to March of the next), and the half hours that are an overlap's second pass:
// an hour per fall-back (two samples), Lord Howe's half hour (one), none in UTC; Apia set its
// clocks back on 2011-04-02 and skipped 2011-12-30; Sao Paulo fell back on 2018-02-17 and
// 2019-02-17
const YEARS: [string, number, number][] = [
    ["America/New_York", 2026, 2],
    ["Europe/London", 2026, 2],
    ["Australia/Lord_Howe", 2026, 1],
    ["Pacific/Apia", 2011, 2],
    ["America/Sao_Paulo", 2018, 4],
    ["UTC", 2026, 0],
];

const formats = new Map<string, Intl.DateTimeFormat>();

function intlWallClock(zone: string, ms: number) {
    let format = formats.get(zone);
    if (!format) {
        format = new Intl.DateTimeFormat("en-GB", {
            timeZone: zone,
            hourCycle: "h23",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        formats.set(zone, format);
    }
    const parts = Object.fromEntries(
        format.formatToParts(ms).map((part) => [part.type, Number(part.value)]),
    );
    return {
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: parts.hour,
        minute: parts.minute,
        second: parts.second,
        millisecond: 0,
    };
}

describe.each(YEARS)("%s in %i", (zone, year, secondPasses) => {
    it("shows Intl's wall clock at every half hour, and resolves it back", () => {
        const start = Date.UTC(year, 0, 1);
        const end = Date.UTC(year + 1, 2, 1);
        let mismatches = 0;
        let overlaps = 0;
        for (let ms = start; ms < end; ms += 1_800_000) {
            const shown = instantToWallClock(ms as Instant, zone);
            if (
                JSON.stringify(shown) !==
                JSON.stringify(intlWallClock(zone, ms))
            ) {
                mismatches++;
            }
            const back = wallClockToInstant(shown, zone);
            if (back !== ms) {
                // only the second pass of a repeated wall clock: an earlier instant shows it too
                expect(back).toBeLessThan(ms);
                expect(instantToWallClock(back, zone)).toEqual(shown);
                overlaps++;
            }
        }
        expect(mismatches).toBe(0);
        expect(overlaps).toBe(secondPasses);
    });
});

describe("instant → wall clock", () => {
    it("gives the date and time a zone shows", () => {
        expect(
            instantToWallClock(
                at("2026-11-26T12:30:45.678Z"),
                "America/Sao_Paulo",
            ),
        ).toEqual({
            year: 2026,
            month: 11,
            day: 26,
            hour: 9,
            minute: 30,
            second: 45,
            millisecond: 678,
        });
        expect(
            plainDateInZone(at("2026-11-27T02:00:00Z"), "America/New_York"),
        ).toEqual({
            year: 2026,
            month: 11,
            day: 26,
        });
        expect(
            plainDateInZone(at("2026-11-27T02:00:00Z"), "Australia/Lord_Howe"),
        ).toEqual({
            year: 2026,
            month: 11,
            day: 27,
        });
    });

    it("reads historic offsets, local mean time included", () => {
        // Sao Paulo kept local mean time (-3:06:28) until 1914
        expect(
            timeZoneOffset("America/Sao_Paulo", at("1900-01-01T12:00:00Z")),
        ).toBeCloseTo(-(3 * 60 + 6 + 28 / 60), 6);
        expect(
            instantToWallClock(at("1900-01-01T12:00:00Z"), "America/Sao_Paulo"),
        ).toMatchObject({
            hour: 8,
            minute: 53,
            second: 32,
        });
    });
});
