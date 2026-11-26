// The time grid (D11), on hand-written cases with FullCalendar's time-grid event placement as the
// reference: slots from `slotMinTime` to `slotMaxTime`; segments as fractions of the column;
// overlap clusters, columns and widening; zero-length occurrences counting as `eventMinDuration`;
// a multi-day occurrence split per column; days of 23 and 25 hours on the wall-clock axis; hidden
// days; the identity of columns that did not change.
import { describe, expect, it } from "vitest";
import type {
    CalendarEventJson,
    CalendarSettingsJson,
    TimeSegment,
} from "../../src/index";
import { modelOf, timed } from "../fixture";

const day = (anchorDate = "2026-11-26") => ({
    view: { type: "day" as const, anchorDate },
});

function gridOf(
    events: CalendarEventJson[],
    settings: CalendarSettingsJson = {},
    anchorDate?: string,
) {
    return modelOf(events, settings, day(anchorDate)).get("time-grid");
}

/** A column's segments as `id col/cols+span` and their fractions in minutes of a 24-hour column. */
function placed(segments: readonly TimeSegment[] | undefined, minutes = 1440) {
    return (segments ?? []).map(
        (segment) =>
            `${segment.occurrenceId} ${segment.column}/${segment.columns}+${segment.span} ${Math.round(segment.top * minutes)}..${Math.round((segment.top + segment.height) * minutes)}`,
    );
}

describe("slots and columns", () => {
    it("lays out the slots of a full day, and a column per visible day", () => {
        const model = modelOf(
            [],
            {},
            { view: { type: "week", anchorDate: "2026-11-26" } },
        );
        const grid = model.get("time-grid");
        expect(grid?.slots).toHaveLength(48);
        expect(grid?.slots[19]).toEqual({
            time: "09:30",
            top: 570 / 1440,
            height: 30 / 1440,
        });
        expect(grid?.columns.map((column) => column.date)).toEqual([
            "2026-11-22",
            "2026-11-23",
            "2026-11-24",
            "2026-11-25",
            "2026-11-26",
            "2026-11-27",
            "2026-11-28",
        ]);
        expect(grid?.columns[4]).toMatchObject({
            today: true,
            past: false,
            weekend: false,
            disabled: false,
        });
        expect(grid?.columns[0]).toMatchObject({ weekend: true, past: true });
    });

    it("leaves hidden days out", () => {
        const model = modelOf(
            [],
            { hiddenDays: [0, 6] },
            { view: { type: "week", anchorDate: "2026-11-26" } },
        );
        expect(model.get("time-grid")?.columns).toHaveLength(5);
    });

    it("spans slotMinTime to slotMaxTime, a last partial slot included", () => {
        const grid = gridOf(
            [
                timed("early", "07:00", "09:00"),
                timed("late", "19:00", "20:00"),
                timed("in", "17:30", "18:30"),
            ],
            { slotMinTime: "08:00", slotMaxTime: "18:15", slotDuration: 30 },
        );
        expect(grid?.slots.map((slot) => slot.time).slice(-2)).toEqual([
            "17:30",
            "18:00",
        ]);
        expect(grid?.slots.at(-1)?.height).toBeCloseTo(15 / 615);
        const segments = grid?.columns[0]?.segments ?? [];
        expect(segments.map((segment) => segment.occurrenceId)).toEqual([
            "early",
            "in",
        ]);
        expect(segments[0]).toMatchObject({
            top: 0,
            continuesBefore: true,
            continuesAfter: false,
        });
        expect(segments[0]?.height).toBeCloseTo(60 / 615);
        expect(segments[1]).toMatchObject({
            continuesBefore: false,
            continuesAfter: true,
        });
        expect(
            (segments[1]?.top ?? 0) + (segments[1]?.height ?? 0),
        ).toBeCloseTo(1);
    });

    it("is null for month and list views", () => {
        expect(
            modelOf(
                [],
                {},
                { view: { type: "month", anchorDate: "2026-11-26" } },
            ).get("time-grid"),
        ).toBeNull();
        expect(
            modelOf(
                [],
                {},
                { view: { type: "list", anchorDate: "2026-11-26" } },
            ).get("time-grid"),
        ).toBeNull();
    });
});

describe("the overlap layout", () => {
    it("gives occurrences that do not overlap the whole column", () => {
        expect(
            placed(
                gridOf([
                    timed("a", "09:00", "10:00"),
                    timed("b", "10:00", "11:00"),
                ])?.columns[0]?.segments,
            ),
        ).toEqual(["a 0/1+1 540..600", "b 0/1+1 600..660"]);
    });

    it("puts overlapping ones side by side, each in the first column free at its start", () => {
        expect(
            placed(
                gridOf([
                    timed("b", "09:00", "10:00"),
                    timed("a", "09:00", "11:00"),
                    timed("c", "10:00", "11:00"),
                ])?.columns[0]?.segments,
            ),
        ).toEqual(["a 0/2+1 540..660", "b 1/2+1 540..600", "c 1/2+1 600..660"]);
    });

    it("widens an occurrence up to the first column holding one it overlaps", () => {
        expect(
            placed(
                gridOf([
                    timed("a", "09:00", "12:00"),
                    timed("b", "09:00", "10:00"),
                    timed("c", "09:00", "10:30"),
                    timed("d", "10:30", "12:00"),
                ])?.columns[0]?.segments,
            ),
        ).toEqual([
            "a 0/3+1 540..720",
            "c 1/3+1 540..630",
            "b 2/3+1 540..600",
            "d 1/3+2 630..720",
        ]);
        expect(
            placed(
                gridOf([
                    timed("a", "09:00", "12:00"),
                    timed("b", "09:00", "10:00"),
                    timed("c", "09:00", "10:30"),
                    timed("d", "10:00", "12:00"),
                    timed("e", "10:45", "12:00"),
                ])?.columns[0]?.segments,
            ),
        ).toEqual([
            "a 0/3+1 540..720",
            "c 1/3+1 540..630",
            "b 2/3+1 540..600",
            "d 2/3+1 600..720",
            // column 1 is free from 10:30; column 2 holds "d", which it overlaps
            "e 1/3+1 645..720",
        ]);
    });

    it("widens the last occurrence of a cluster over the free columns to its right", () => {
        expect(
            placed(
                gridOf([
                    timed("a", "09:00", "10:00"),
                    timed("b", "09:00", "10:00"),
                    timed("c", "09:00", "09:30"),
                    timed("d", "09:30", "10:00"),
                ])?.columns[0]?.segments,
            ),
        ).toEqual([
            "a 0/3+1 540..600",
            "b 1/3+1 540..600",
            "c 2/3+1 540..570",
            "d 2/3+1 570..600",
        ]);
        expect(
            placed(
                gridOf([
                    timed("long", "09:00", "11:00"),
                    timed("x", "09:00", "09:30"),
                    timed("y", "09:00", "09:30"),
                    timed("free", "10:00", "11:00"),
                ])?.columns[0]?.segments,
            ),
        ).toEqual([
            "long 0/3+1 540..660",
            "x 1/3+1 540..570",
            "y 2/3+1 540..570",
            "free 1/3+2 600..660",
        ]);
    });

    it("counts a zero-length occurrence as eventMinDuration for overlap", () => {
        const events = [
            timed("deadline", "09:00", "09:00"),
            timed("next", "09:10", "09:40"),
        ];
        expect(placed(gridOf(events)?.columns[0]?.segments)).toEqual([
            "deadline 0/2+1 540..540",
            "next 1/2+1 550..580",
        ]);
        expect(
            placed(
                gridOf(events, { eventMinDuration: 5 })?.columns[0]?.segments,
            ),
        ).toEqual(["deadline 0/1+1 540..540", "next 0/1+1 550..580"]);
    });

    it("orders ties by eventOrder", () => {
        const events = [
            timed("z", "09:00", "10:00", { title: "Zed" }),
            timed("a", "09:00", "10:00", { title: "Abe" }),
        ];
        expect(
            placed(gridOf(events)?.columns[0]?.segments).map(
                (text) => text.split(" ")[0],
            ),
        ).toEqual(["a", "z"]);
        expect(
            placed(
                gridOf(events, { eventOrder: "-title" })?.columns[0]?.segments,
            ).map((text) => text.split(" ")[0]),
        ).toEqual(["z", "a"]);
    });
});

describe("occurrences across days and DST", () => {
    it("splits a multi-day occurrence per column", () => {
        const model = modelOf(
            [timed("night", "2026-11-25T22:00:00Z", "2026-11-26T02:00:00Z")],
            {},
            { view: { type: "week", anchorDate: "2026-11-26" } },
        );
        const columns = model.get("time-grid")?.columns;
        expect(placed(columns?.[3]?.segments)).toEqual([
            "night 0/1+1 1320..1440",
        ]);
        expect(columns?.[3]?.segments[0]).toMatchObject({
            continuesBefore: false,
            continuesAfter: true,
        });
        expect(placed(columns?.[4]?.segments)).toEqual(["night 0/1+1 0..120"]);
        expect(columns?.[4]?.segments[0]).toMatchObject({
            continuesBefore: true,
            continuesAfter: false,
        });
    });

    it("places a 23-hour day's occurrences at their wall-clock times", () => {
        // New York springs forward at 02:00 on 2026-03-08: 01:00 EST to 04:00 EDT is two hours
        const grid = gridOf(
            [
                timed(
                    "a",
                    "2026-03-08T01:00:00-05:00",
                    "2026-03-08T04:00:00-04:00",
                ),
                timed(
                    "b",
                    "2026-03-08T05:00:00-04:00",
                    "2026-03-09T00:00:00-04:00",
                ),
            ],
            { timeZone: "America/New_York" },
            "2026-03-08",
        );
        expect(placed(grid?.columns[0]?.segments)).toEqual([
            "a 0/1+1 60..240",
            "b 0/1+1 300..1440",
        ]);
    });

    it("places a 25-hour day's occurrences at their wall-clock times", () => {
        // New York falls back at 02:00 on 2026-11-01: 00:30 EDT to 03:00 EST is three and a half hours
        const grid = gridOf(
            [
                timed(
                    "a",
                    "2026-11-01T00:30:00-04:00",
                    "2026-11-01T03:00:00-05:00",
                ),
            ],
            { timeZone: "America/New_York" },
            "2026-11-01",
        );
        expect(placed(grid?.columns[0]?.segments)).toEqual(["a 0/1+1 30..180"]);
    });

    it("has no occurrence on a skipped day", () => {
        // Samoa skipped 2011-12-30: the 29th ends where the 31st starts
        const model = modelOf(
            [
                timed(
                    "a",
                    "2011-12-29T22:00:00-10:00",
                    "2011-12-31T02:00:00+14:00",
                ),
            ],
            { timeZone: "Pacific/Apia" },
            { view: { type: "days", anchorDate: "2011-12-29", days: 3 } },
        );
        const columns = model.get("time-grid")?.columns;
        expect(columns?.map((column) => placed(column.segments))).toEqual([
            ["a 0/1+1 1320..1440"],
            [],
            ["a 0/1+1 0..120"],
        ]);
    });
});

describe("identity (D11)", () => {
    it("keeps the columns a move did not touch", () => {
        const model = modelOf(
            [
                timed("a", "09:00", "10:00", { date: "2026-11-23" }),
                timed("b", "09:00", "10:00", { date: "2026-11-25" }),
            ],
            {},
            { view: { type: "week", anchorDate: "2026-11-26" } },
        );
        const before = model.get("time-grid");
        model.run("event.move", { eventId: "b", delta: { days: 1 } });
        const after = model.get("time-grid");
        expect(
            after?.columns.map((column, i) => column === before?.columns[i]),
        ).toEqual([true, true, true, false, false, true, true]);
        expect(after?.slots).toBe(before?.slots);
    });
});
