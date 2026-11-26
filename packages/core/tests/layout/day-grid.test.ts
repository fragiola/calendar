// The day grid (D11), on hand-written cases with FullCalendar's event placement and more-link
// behaviour as the reference: lanes by start, then longer first, then `eventOrder`; segments split
// per week with `continuesBefore` / `continuesAfter`; `dayMaxEvents` hiding lanes past it with
// each day's `hiddenCount`; hidden days left out of the columns; and the identity of rows that did
// not change.
import { describe, expect, it } from "vitest";
import type { Segment } from "../../src/index";
import { allDay, modelOf, timed } from "../fixture";

const month = { view: { type: "month" as const, anchorDate: "2026-11-26" } };

/** A week's segments as `id:startColumn+span@lane` (with `<`/`>` for continuing ones). */
function lanes(segments: readonly Segment[] | undefined): string[] {
    return (segments ?? []).map(
        (segment) =>
            `${segment.continuesBefore ? "<" : ""}${segment.occurrenceId}:${segment.startColumn}+${segment.span}@${segment.lane}${segment.continuesAfter ? ">" : ""}`,
    );
}

describe("the month's day grid", () => {
    it("lays out six weeks of days with their state", () => {
        const grid = modelOf([], {}, month).get("day-grid");
        expect(grid?.weeks).toHaveLength(6);
        const week = grid?.weeks[3];
        expect(week?.id).toBe("2026-11-22");
        expect(week?.weekNumber).toBe(48);
        expect(week?.days.map((day) => day.date)).toEqual([
            "2026-11-22",
            "2026-11-23",
            "2026-11-24",
            "2026-11-25",
            "2026-11-26",
            "2026-11-27",
            "2026-11-28",
        ]);
        expect(week?.days[4]).toEqual({
            date: "2026-11-26",
            today: true,
            outside: false,
            weekend: false,
            past: false,
            disabled: false,
            hiddenCount: 0,
            hiddenOccurrenceIds: [],
        });
        expect(week?.days[0]).toMatchObject({ weekend: true, past: true });
        expect(grid?.weeks[5]?.days[0]).toMatchObject({
            date: "2026-12-06",
            outside: true,
        });
    });

    it("numbers weeks the ISO way on request", () => {
        const model = modelOf(
            [],
            { weekNumbers: "iso" },
            { view: { type: "month", anchorDate: "2027-01-10" } },
        );
        // the row of 2026-12-27 (Sunday) to 2027-01-02 is mostly ISO week 53 of 2026
        expect(
            model.get("day-grid")?.weeks.map((week) => week.weekNumber),
        ).toEqual([53, 1, 2, 3, 4, 5]);
    });

    it("packs segments into lanes by start, then longer first, then eventOrder", () => {
        const model = modelOf(
            [
                allDay("short", "2026-11-24", "2026-11-25"),
                allDay("long", "2026-11-24", "2026-11-27"),
                allDay("later", "2026-11-25", "2026-11-26"),
                allDay("b", "2026-11-27", "2026-11-28", { title: "b" }),
                allDay("a", "2026-11-27", "2026-11-28", { title: "a" }),
                timed("timed", "09:00", "10:00", { date: "2026-11-28" }),
            ],
            {},
            month,
        );
        expect(lanes(model.get("day-grid")?.weeks[3]?.segments)).toEqual([
            "long:2+3@0",
            "a:5+1@0",
            "timed:6+1@0",
            "short:2+1@1",
            // the lowest lane free over its columns: "short" holds lane 1 on Tuesday only
            "later:3+1@1",
            "b:5+1@1",
        ]);
    });

    it("splits a multi-week occurrence per week, marking where it continues", () => {
        const model = modelOf(
            [allDay("trip", "2026-11-26", "2026-12-09")],
            {},
            month,
        );
        const weeks = model.get("day-grid")?.weeks;
        expect(lanes(weeks?.[3]?.segments)).toEqual(["trip:4+3@0>"]);
        expect(lanes(weeks?.[4]?.segments)).toEqual(["<trip:0+7@0>"]);
        expect(lanes(weeks?.[5]?.segments)).toEqual(["<trip:0+3@0"]);
    });

    it("shows a timed occurrence on the days it covers, nextDayThreshold applied", () => {
        const late = timed(
            "late",
            "2026-11-24T22:00:00Z",
            "2026-11-25T08:00:00Z",
        );
        expect(
            lanes(
                modelOf([late], {}, month).get("day-grid")?.weeks[3]?.segments,
            ),
        ).toEqual(["late:2+2@0"]);
        expect(
            lanes(
                modelOf([late], { nextDayThreshold: "09:00" }, month).get(
                    "day-grid",
                )?.weeks[3]?.segments,
            ),
        ).toEqual(["late:2+1@0"]);
        // an end exactly at midnight does not reach the next day
        const midnight = timed(
            "midnight",
            "2026-11-24T22:00:00Z",
            "2026-11-25T00:00:00Z",
        );
        expect(
            lanes(
                modelOf([midnight], {}, month).get("day-grid")?.weeks[3]
                    ?.segments,
            ),
        ).toEqual(["midnight:2+1@0"]);
    });

    it("places days in the display zone", () => {
        // 02:00Z on the 25th is still the 24th in Sao Paulo
        const model = modelOf(
            [timed("t", "2026-11-25T02:00:00Z", "2026-11-25T03:00:00Z")],
            { timeZone: "America/Sao_Paulo" },
            month,
        );
        expect(lanes(model.get("day-grid")?.weeks[3]?.segments)).toEqual([
            "t:2+1@0",
        ]);
    });

    it("hides lanes past dayMaxEvents, counting each day's hidden occurrences", () => {
        const model = modelOf(
            [
                allDay("a", "2026-11-23", "2026-11-26"),
                allDay("b", "2026-11-24", "2026-11-25"),
                allDay("c", "2026-11-24", "2026-11-26"),
                allDay("d", "2026-11-25", "2026-11-26"),
            ],
            { dayMaxEvents: 2 },
            month,
        );
        const week = model.get("day-grid")?.weeks[3];
        expect(lanes(week?.segments)).toEqual(["a:1+3@0", "c:2+2@1"]);
        expect(week?.lanes).toBe(2);
        expect(week?.days.map((day) => day.hiddenCount)).toEqual([
            0, 0, 1, 1, 0, 0, 0,
        ]);
        expect(week?.days[2]?.hiddenOccurrenceIds).toEqual(["b"]);
        expect(week?.days[3]?.hiddenOccurrenceIds).toEqual(["d"]);
    });

    it("takes the engine's maxLanes for dayMaxEvents auto, and shows all without it", () => {
        const events = [
            allDay("a", "2026-11-24", "2026-11-25"),
            allDay("b", "2026-11-24", "2026-11-25"),
        ];
        const model = modelOf(events, { dayMaxEvents: "auto" }, month);
        expect(model.get("day-grid")?.weeks[3]?.segments).toHaveLength(2);
        expect(
            model.get("day-grid", { maxLanes: 1 })?.weeks[3]?.days[2]
                ?.hiddenCount,
        ).toBe(1);
        expect(
            modelOf(events, {}, month).get("day-grid", { maxLanes: 1 })
                ?.weeks[3]?.segments,
        ).toHaveLength(2);
    });

    it("leaves hidden days out of the columns", () => {
        const model = modelOf(
            [
                allDay("weekend", "2026-11-28", "2026-11-30"),
                allDay("span", "2026-11-27", "2026-12-01"),
            ],
            { hiddenDays: [0, 6] },
            month,
        );
        const weeks = model.get("day-grid")?.weeks;
        expect(weeks?.[3]?.days.map((day) => day.date)).toEqual([
            "2026-11-23",
            "2026-11-24",
            "2026-11-25",
            "2026-11-26",
            "2026-11-27",
        ]);
        expect(lanes(weeks?.[3]?.segments)).toEqual(["span:4+1@0>"]);
        expect(lanes(weeks?.[4]?.segments)).toEqual(["<span:0+1@0"]);
    });

    it("leaves out the occurrences of hidden calendars", () => {
        const model = modelOf(
            [allDay("a", "2026-11-24", "2026-11-25", { calendarId: "off" })],
            {},
            {
                ...month,
                calendars: [{ id: "off", title: "Off", visible: false }],
            },
        );
        expect(model.get("day-grid")?.weeks[3]?.segments).toEqual([]);
    });
});

describe("a time-grid view's all-day row", () => {
    it("holds the all-day occurrences of the view's days in one row", () => {
        const model = modelOf(
            [
                allDay("a", "2026-11-20", "2026-11-25"),
                timed("t", "09:00", "10:00"),
            ],
            {},
            { view: { type: "week", anchorDate: "2026-11-26" } },
        );
        const grid = model.get("day-grid");
        expect(grid?.weeks).toHaveLength(1);
        expect(grid?.weeks[0]?.days).toHaveLength(7);
        expect(lanes(grid?.weeks[0]?.segments)).toEqual(["<a:0+3@0"]);
    });

    it("is null for a list view", () => {
        expect(
            modelOf(
                [],
                {},
                { view: { type: "list", anchorDate: "2026-11-26" } },
            ).get("day-grid"),
        ).toBeNull();
    });
});

describe("identity (D11)", () => {
    it("is the same object for the same state, and keeps the rows a move did not touch", () => {
        const model = modelOf(
            [
                allDay("a", "2026-11-03", "2026-11-04"),
                allDay("b", "2026-11-24", "2026-11-25"),
            ],
            {},
            month,
        );
        const before = model.get("day-grid");
        expect(model.get("day-grid")).toBe(before);
        model.run("event.move", { eventId: "b", delta: { days: 7 } });
        const after = model.get("day-grid");
        expect(after).not.toBe(before);
        expect(
            after?.weeks.map((week, i) => week === before?.weeks[i]),
        ).toEqual([true, true, true, false, false, true]);
        expect(Object.isFrozen(after?.weeks[3])).toBe(true);
    });

    it("makes new only the row of an event whose fields changed, its ids the same", () => {
        const model = modelOf(
            [
                allDay("a", "2026-11-03", "2026-11-04"),
                allDay("b", "2026-11-24", "2026-11-25"),
            ],
            {},
            month,
        );
        const before = model.get("day-grid");
        model.run("event.update", { eventId: "b", title: "renamed" });
        const after = model.get("day-grid");
        expect(
            after?.weeks.map((week, i) => week === before?.weeks[i]),
        ).toEqual([true, true, true, false, true, true]);
    });

    it("keeps every row when a change is outside the view", () => {
        const model = modelOf(
            [allDay("a", "2026-11-03", "2026-11-04")],
            {},
            month,
        );
        const before = model.get("day-grid");
        model.run("event.add", {
            title: "far",
            start: "2027-05-01",
            allDay: true,
        });
        const after = model.get("day-grid");
        expect(after?.weeks.every((week, i) => week === before?.weeks[i])).toBe(
            true,
        );
    });
});
