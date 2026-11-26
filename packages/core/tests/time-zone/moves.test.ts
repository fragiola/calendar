// Moves (D4): a move by whole days is a calendar delta on the zone's wall clock, so 09:00 stays
// 09:00 across a DST change; a move by minutes is an instant delta, so the wall clock shifts.
import { describe, expect, it } from "vitest";
import { addMinutes } from "../../src/time/add-minutes";
import { minutesBetween } from "../../src/time/minutes-between";
import { addDaysInZone } from "../../src/time-zone/add-days-in-zone";
import { formatInstant } from "../../src/time-zone/format-instant";
import { at } from "../time/date-time-of";

const DAY_MOVES: [string, string, number, string, number][] = [
    // zone, from, days, to, exact minutes between
    [
        "America/New_York",
        "2026-03-07T09:00:00-05:00",
        1,
        "2026-03-08T09:00:00-04:00",
        1380,
    ],
    [
        "America/New_York",
        "2026-10-31T09:00:00-04:00",
        1,
        "2026-11-01T09:00:00-05:00",
        1500,
    ],
    [
        "America/New_York",
        "2026-03-01T09:00:00-05:00",
        14,
        "2026-03-15T09:00:00-04:00",
        14 * 1440 - 60,
    ],
    [
        "America/New_York",
        "2026-03-09T09:00:00-04:00",
        -2,
        "2026-03-07T09:00:00-05:00",
        -(2 * 1440 - 60),
    ],
    [
        "Europe/London",
        "2026-03-28T09:00:00Z",
        1,
        "2026-03-29T09:00:00+01:00",
        1380,
    ],
    [
        "Australia/Lord_Howe",
        "2026-10-03T09:00:00+10:30",
        1,
        "2026-10-04T09:00:00+11:00",
        1410,
    ],
    [
        "Australia/Lord_Howe",
        "2026-04-04T09:00:00+11:00",
        1,
        "2026-04-05T09:00:00+10:30",
        1470,
    ],
    [
        "America/Sao_Paulo",
        "2018-11-03T09:00:00-03:00",
        1,
        "2018-11-04T09:00:00-02:00",
        1380,
    ],
    [
        "America/Sao_Paulo",
        "2019-02-16T09:00:00-02:00",
        1,
        "2019-02-17T09:00:00-03:00",
        1500,
    ],
    // the day it lands on is skipped: the wall clock moves past the gap
    [
        "Pacific/Apia",
        "2011-12-29T09:00:00-10:00",
        1,
        "2011-12-31T09:00:00+14:00",
        1440,
    ],
    [
        "Pacific/Apia",
        "2011-12-29T09:00:00-10:00",
        2,
        "2011-12-31T09:00:00+14:00",
        1440,
    ],
    // a wall clock the target day skips moves forward; a repeated one takes the earlier offset
    [
        "America/New_York",
        "2026-03-07T02:30:00-05:00",
        1,
        "2026-03-08T03:30:00-04:00",
        1440,
    ],
    [
        "America/New_York",
        "2026-10-31T01:30:00-04:00",
        1,
        "2026-11-01T01:30:00-04:00",
        1440,
    ],
    [
        "America/Sao_Paulo",
        "2018-11-03T00:00:00-03:00",
        1,
        "2018-11-04T01:00:00-02:00",
        1440,
    ],
    ["UTC", "2026-03-07T09:00:00Z", 1, "2026-03-08T09:00:00Z", 1440],
];

describe("moving by whole days", () => {
    it.each(DAY_MOVES)(
        "in %s, %s + %i days is %s",
        (zone, from, days, to, minutes) => {
            const moved = addDaysInZone(at(from), days, zone);
            expect(formatInstant(moved, zone)).toBe(to);
            expect(minutesBetween(at(from), moved)).toBe(minutes);
        },
    );

    it("by zero days keeps the instant, even the second pass of an overlap", () => {
        const secondPass = at("2026-11-01T01:30:00-05:00");
        expect(addDaysInZone(secondPass, 0, "America/New_York")).toBe(
            secondPass,
        );
    });
});

describe("moving by minutes", () => {
    it.each([
        [
            "America/New_York",
            "2026-03-07T09:00:00-05:00",
            1440,
            "2026-03-08T10:00:00-04:00",
        ],
        [
            "America/New_York",
            "2026-10-31T09:00:00-04:00",
            1440,
            "2026-11-01T08:00:00-05:00",
        ],
        [
            "Australia/Lord_Howe",
            "2026-10-03T09:00:00+10:30",
            1440,
            "2026-10-04T09:30:00+11:00",
        ],
        [
            "Pacific/Apia",
            "2011-12-29T09:00:00-10:00",
            1440,
            "2011-12-31T09:00:00+14:00",
        ],
        [
            "America/Sao_Paulo",
            "2018-11-03T23:59:00-03:00",
            1,
            "2018-11-04T01:00:00-02:00",
        ],
        ["UTC", "2026-03-07T09:00:00Z", 1440, "2026-03-08T09:00:00Z"],
    ] as const)("in %s, %s + %i minutes is %s", (zone, from, minutes, to) => {
        const moved = addMinutes(at(from), minutes);
        expect(formatInstant(moved, zone)).toBe(to);
        expect(minutesBetween(at(from), moved)).toBe(minutes);
    });
});
