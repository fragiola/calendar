// The D4 matrix: every zone's offsets on both sides of its transitions, gaps resolved forward,
// overlaps to the earlier offset, day lengths and starts of day. The transitions were read from
// the engine's zone data with a brute-force scan (one `Intl` read per minute) and match the
// published rules: New York 2026-03-08 / 2026-11-01 at 02:00, London 2026-03-29 / 2026-10-25 at
// 01:00 UTC, Lord Howe 2026-04-05 / 2026-10-04 at 02:00 (a 30-minute DST), Apia skipping
// 2011-12-30 (UTC-10 to UTC+14), Sao Paulo's last DST 2018-11-04 (00:00 skipped) to 2019-02-17
// (23:00 repeated), and UTC with none.
import { describe, expect, it } from "vitest";
import { formatInstant } from "../../src/time-zone/format-instant";
import { minutesInDay } from "../../src/time-zone/minutes-in-day";
import { startOfDay } from "../../src/time-zone/start-of-day";
import { timeZoneOffset } from "../../src/time-zone/time-zone-offset";
import { wallClockToInstant } from "../../src/time-zone/wall-clock-to-instant";
import { at, date, wall } from "../time/date-time-of";

interface ZoneCase {
    zone: string;
    /** [instant, offset in minutes] on both sides of each transition. */
    offsets: [string, number][];
    /** [wall clock, the instant it resolves to] for gaps, overlaps and ordinary times. */
    wallClocks: [string, string][];
    /** [date, minutes in the day, its first instant]. */
    days: [string, number, string][];
}

const MATRIX: ZoneCase[] = [
    {
        zone: "America/New_York",
        offsets: [
            ["2026-03-08T06:59:59Z", -300],
            ["2026-03-08T07:00:00Z", -240],
            ["2026-11-01T05:59:59Z", -240],
            ["2026-11-01T06:00:00Z", -300],
        ],
        wallClocks: [
            ["2026-03-08T01:59", "2026-03-08T01:59:00-05:00"],
            ["2026-03-08T02:00", "2026-03-08T03:00:00-04:00"],
            ["2026-03-08T02:30", "2026-03-08T03:30:00-04:00"],
            ["2026-03-08T03:00", "2026-03-08T03:00:00-04:00"],
            ["2026-11-01T00:59", "2026-11-01T00:59:00-04:00"],
            ["2026-11-01T01:00", "2026-11-01T01:00:00-04:00"],
            ["2026-11-01T01:30", "2026-11-01T01:30:00-04:00"],
            ["2026-11-01T02:00", "2026-11-01T02:00:00-05:00"],
        ],
        days: [
            ["2026-03-07", 1440, "2026-03-07T00:00:00-05:00"],
            ["2026-03-08", 1380, "2026-03-08T00:00:00-05:00"],
            ["2026-11-01", 1500, "2026-11-01T00:00:00-04:00"],
            ["2026-11-02", 1440, "2026-11-02T00:00:00-05:00"],
        ],
    },
    {
        zone: "Europe/London",
        offsets: [
            ["2026-03-29T00:59:59Z", 0],
            ["2026-03-29T01:00:00Z", 60],
            ["2026-10-25T00:59:59Z", 60],
            ["2026-10-25T01:00:00Z", 0],
        ],
        wallClocks: [
            ["2026-03-29T01:30", "2026-03-29T02:30:00+01:00"],
            ["2026-03-29T02:00", "2026-03-29T02:00:00+01:00"],
            ["2026-10-25T01:30", "2026-10-25T01:30:00+01:00"],
            ["2026-10-25T02:00", "2026-10-25T02:00:00Z"],
        ],
        days: [
            ["2026-03-29", 1380, "2026-03-29T00:00:00Z"],
            ["2026-10-25", 1500, "2026-10-25T00:00:00+01:00"],
            ["2026-11-26", 1440, "2026-11-26T00:00:00Z"],
        ],
    },
    {
        zone: "Australia/Lord_Howe",
        offsets: [
            ["2026-04-04T14:59:59Z", 660],
            ["2026-04-04T15:00:00Z", 630],
            // the October transition is at half past a UTC hour: that hour is read to the second
            ["2026-10-03T15:00:00Z", 630],
            ["2026-10-03T15:29:59Z", 630],
            ["2026-10-03T15:30:00Z", 660],
            ["2026-10-03T15:59:59Z", 660],
        ],
        wallClocks: [
            ["2026-04-05T01:29", "2026-04-05T01:29:00+11:00"],
            ["2026-04-05T01:30", "2026-04-05T01:30:00+11:00"],
            ["2026-04-05T01:45", "2026-04-05T01:45:00+11:00"],
            ["2026-04-05T02:00", "2026-04-05T02:00:00+10:30"],
            ["2026-10-04T01:59", "2026-10-04T01:59:00+10:30"],
            ["2026-10-04T02:00", "2026-10-04T02:30:00+11:00"],
            ["2026-10-04T02:15", "2026-10-04T02:45:00+11:00"],
            ["2026-10-04T02:30", "2026-10-04T02:30:00+11:00"],
        ],
        days: [
            ["2026-04-05", 1470, "2026-04-05T00:00:00+11:00"],
            ["2026-10-04", 1410, "2026-10-04T00:00:00+10:30"],
            ["2026-07-01", 1440, "2026-07-01T00:00:00+10:30"],
        ],
    },
    {
        zone: "Pacific/Apia",
        offsets: [
            ["2011-12-30T09:59:59Z", -600],
            ["2011-12-30T10:00:00Z", 840],
        ],
        wallClocks: [
            ["2011-12-29T23:59", "2011-12-29T23:59:00-10:00"],
            // the whole of 2011-12-30 is skipped: its wall clocks move a day forward
            ["2011-12-30T00:00", "2011-12-31T00:00:00+14:00"],
            ["2011-12-30T12:00", "2011-12-31T12:00:00+14:00"],
            ["2011-12-31T00:00", "2011-12-31T00:00:00+14:00"],
        ],
        days: [
            ["2011-12-29", 1440, "2011-12-29T00:00:00-10:00"],
            ["2011-12-30", 0, "2011-12-31T00:00:00+14:00"],
            ["2011-12-31", 1440, "2011-12-31T00:00:00+14:00"],
        ],
    },
    {
        zone: "America/Sao_Paulo",
        offsets: [
            ["2018-11-04T02:59:59Z", -180],
            ["2018-11-04T03:00:00Z", -120],
            ["2019-02-17T01:59:59Z", -120],
            ["2019-02-17T02:00:00Z", -180],
            // no DST since 2019
            ["2019-11-03T12:00:00Z", -180],
            ["2026-01-15T12:00:00Z", -180],
        ],
        wallClocks: [
            // midnight is skipped: the day starts at 01:00
            ["2018-11-04T00:00", "2018-11-04T01:00:00-02:00"],
            ["2018-11-04T00:30", "2018-11-04T01:30:00-02:00"],
            ["2018-11-04T01:00", "2018-11-04T01:00:00-02:00"],
            ["2019-02-16T22:59", "2019-02-16T22:59:00-02:00"],
            ["2019-02-16T23:30", "2019-02-16T23:30:00-02:00"],
            ["2019-02-17T00:00", "2019-02-17T00:00:00-03:00"],
        ],
        days: [
            ["2018-11-03", 1440, "2018-11-03T00:00:00-03:00"],
            ["2018-11-04", 1380, "2018-11-04T01:00:00-02:00"],
            ["2019-02-16", 1500, "2019-02-16T00:00:00-02:00"],
            ["2019-02-17", 1440, "2019-02-17T00:00:00-03:00"],
            ["2026-11-26", 1440, "2026-11-26T00:00:00-03:00"],
        ],
    },
    {
        zone: "UTC",
        offsets: [
            ["2026-03-08T07:00:00Z", 0],
            ["2026-10-25T01:00:00Z", 0],
        ],
        wallClocks: [
            ["2026-03-08T02:30", "2026-03-08T02:30:00Z"],
            ["2026-11-01T01:30", "2026-11-01T01:30:00Z"],
        ],
        days: [
            ["2026-03-08", 1440, "2026-03-08T00:00:00Z"],
            ["2026-11-01", 1440, "2026-11-01T00:00:00Z"],
        ],
    },
];

describe.each(MATRIX)("$zone", ({ zone, offsets, wallClocks, days }) => {
    it.each(offsets)(
        "has its offset at %s: %i minutes",
        (instantText, offset) => {
            expect(timeZoneOffset(zone, at(instantText))).toBe(offset);
            // and again, from the cache
            expect(timeZoneOffset(zone, at(instantText))).toBe(offset);
        },
    );

    it.each(wallClocks)(
        "resolves the wall clock %s to %s (compatible)",
        (wallText, expected) => {
            const resolved = wallClockToInstant(wall(wallText), zone);
            expect(formatInstant(resolved, zone)).toBe(expected);
            expect(resolved).toBe(at(expected));
        },
    );

    it.each(days)(
        "lasts %s: %i minutes from %s",
        (dateText, minutes, first) => {
            expect(minutesInDay(date(dateText), zone)).toBe(minutes);
            expect(formatInstant(startOfDay(date(dateText), zone), zone)).toBe(
                first,
            );
        },
    );
});
