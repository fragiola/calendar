// The grids' ARIA state (Epic #13's carry-over of D12): today is the current date, the date cells
// are selectable only with `selection()`, the cells outside `validRange` are disabled, a month's
// column headers carry no day state, and a time grid's rows count the same columns.
import { describe, expect, it } from "vitest";
import { createCalendarEngine, partAttributes } from "../../src/index";
import { selection } from "../../src/selection/index";
import { modelOf } from "../fixture";

const week = { view: { type: "week" as const, anchorDate: "2026-11-26" } };
const month = { view: { type: "month" as const, anchorDate: "2026-11-26" } };

describe("the grids' ARIA state", () => {
    it("marks today's cell and a time grid's header of today as the current date", () => {
        const model = modelOf([], {}, month);
        expect(
            partAttributes(model, "day", { date: "2026-11-26" })[
                "aria-current"
            ],
        ).toBe("date");
        expect(
            partAttributes(model, "day", { date: "2026-11-25" })[
                "aria-current"
            ],
        ).toBeUndefined();
        model.run("view.set", { type: "week" });
        expect(
            partAttributes(model, "column-header", { date: "2026-11-26" })[
                "aria-current"
            ],
        ).toBe("date");
        expect(
            partAttributes(model, "slot", {
                date: "2026-11-26",
                time: "09:00",
            })["aria-current"],
        ).toBeUndefined();
    });

    it("gives every date cell aria-selected only with selection(), its grid multiselectable", () => {
        const bare = modelOf([], {}, month);
        expect(
            partAttributes(bare, "day", { date: "2026-11-26" })[
                "aria-selected"
            ],
        ).toBeUndefined();
        expect(
            partAttributes(bare, "day-grid", {})["aria-multiselectable"],
        ).toBeUndefined();

        const model = modelOf([], {}, month, { features: [selection()] });
        expect(partAttributes(model, "day-grid", {})).toMatchObject({
            "aria-multiselectable": "true",
        });
        const day = (date: string) =>
            partAttributes(model, "day", { date })["aria-selected"];
        expect(day("2026-11-26")).toBe("false");
        model.run("selection.set", {
            start: "2026-11-26",
            end: "2026-11-28",
            allDay: true,
        });
        expect(day("2026-11-26")).toBe("true");
        expect(day("2026-11-27")).toBe("true");
        expect(day("2026-11-28")).toBe("false");

        model.run("view.set", { type: "week" });
        const slot = partAttributes(model, "slot", {
            date: "2026-11-26",
            time: "09:00",
        });
        expect(slot["aria-selected"]).toBe("false");
        // a header is not a selectable cell
        expect(
            partAttributes(model, "column-header", { date: "2026-11-26" })[
                "aria-selected"
            ],
        ).toBeUndefined();
    });

    it("the engine gives the same states as the model before it", () => {
        const model = modelOf([], {}, week, { features: [selection()] });
        const engine = createCalendarEngine(model);
        for (const [part, payload] of [
            ["time-grid", {}],
            ["day", { date: "2026-11-26" }],
            ["slot", { date: "2026-11-26", time: "09:00" }],
            ["column-header", { date: "2026-11-26" }],
            ["column", { date: "2026-11-26" }],
            ["slot-label", { time: "09:00" }],
        ] as const) {
            expect(engine.adapter.attributes(part, payload as never)).toEqual(
                partAttributes(model, part, payload as never),
            );
        }
        engine.destroy();
    });

    it("disables the days and slots outside validRange", () => {
        const settings = {
            validRange: { start: "2026-11-24", end: "2026-12-10" },
        };
        const model = modelOf([], settings, month);
        expect(
            partAttributes(model, "day", { date: "2026-11-23" }),
        ).toMatchObject({ "data-disabled": "", "aria-disabled": "true" });
        expect(
            partAttributes(model, "day", { date: "2026-11-24" })[
                "aria-disabled"
            ],
        ).toBeUndefined();
        model.run("view.set", { type: "week" });
        expect(
            partAttributes(model, "slot", {
                date: "2026-11-23",
                time: "09:00",
            })["aria-disabled"],
        ).toBe("true");
        expect(
            partAttributes(model, "slot", {
                date: "2026-11-26",
                time: "09:00",
            })["aria-disabled"],
        ).toBeUndefined();
    });

    it("gives a month's column headers their weekday, not the first row's day state", () => {
        // Monday first: November 2026's first row starts on Monday 2026-10-26, outside and past
        const model = modelOf([], { firstDayOfWeek: 1 }, month);
        expect(
            partAttributes(model, "day", { date: "2026-11-01" }),
        ).toMatchObject({ "data-weekend": "" });
        expect(
            partAttributes(model, "day", { date: "2026-10-26" }),
        ).toMatchObject({ "data-outside": "", "data-past": "" });
        expect(
            partAttributes(model, "column-header", { date: "2026-10-26" }),
        ).toEqual({
            "data-calendar-part": "column-header",
            role: "columnheader",
            "data-date": "2026-10-26",
        });
        expect(
            partAttributes(model, "column-header", { date: "2026-11-01" }),
        ).toEqual({
            "data-calendar-part": "column-header",
            role: "columnheader",
            "data-date": "2026-11-01",
            "data-weekend": "",
        });
    });

    it("numbers a time grid's columns, so every row counts the axis and the days", () => {
        const model = modelOf([], {}, week);
        expect(partAttributes(model, "time-grid", {})["aria-colcount"]).toBe(
            "8",
        );
        expect(
            partAttributes(model, "slot-label", { time: "09:00" })[
                "aria-colindex"
            ],
        ).toBe("1");
        // 2026-11-22 is the week's first day (Sunday): column 2
        for (const part of ["column-header", "day", "column"] as const) {
            expect(
                partAttributes(model, part, { date: "2026-11-22" })[
                    "aria-colindex"
                ],
            ).toBe("2");
        }
        expect(
            partAttributes(model, "slot", {
                date: "2026-11-28",
                time: "09:00",
            })["aria-colindex"],
        ).toBe("8");
        // a month numbers nothing (its week numbers are the app's choice)
        model.run("view.set", { type: "month" });
        expect(
            partAttributes(model, "day", { date: "2026-11-22" })[
                "aria-colindex"
            ],
        ).toBeUndefined();
        expect(
            partAttributes(model, "day-grid", {})["aria-colcount"],
        ).toBeUndefined();
    });

    it("numbers a month's columns when its rows render a week number (weekNumberColumn)", () => {
        const model = modelOf([], { hiddenDays: [6] }, month);
        const numbered = { weekNumberColumn: true };
        // six days shown (Saturday hidden), the week number before them
        expect(
            partAttributes(model, "day-grid", {}, numbered)["aria-colcount"],
        ).toBe("7");
        const grid = model.get("day-grid");
        const week = grid?.weeks[1];
        expect(week).toBeDefined();
        expect(
            partAttributes(
                model,
                "week-number",
                { weekId: week?.id ?? "" },
                numbered,
            )["aria-colindex"],
        ).toBe("1");
        week?.days.forEach((day, index) => {
            expect(
                partAttributes(model, "day", { date: day.date }, numbered)[
                    "aria-colindex"
                ],
            ).toBe(String(index + 2));
        });
        // the header row of six counts the same columns: each header after the week numbers'
        grid?.weeks[0]?.days.forEach((day, index) => {
            expect(
                partAttributes(
                    model,
                    "column-header",
                    { date: day.date },
                    numbered,
                )["aria-colindex"],
            ).toBe(String(index + 2));
        });
        // the engine gives the same
        const engine = createCalendarEngine(model);
        const first = week?.days[0]?.date ?? "";
        expect(
            engine.adapter.attributes("day", { date: first }, numbered)[
                "aria-colindex"
            ],
        ).toBe("2");
        expect(
            engine.adapter.attributes("day-grid", {}, numbered)[
                "aria-colcount"
            ],
        ).toBe("7");
        engine.destroy();
        // a time grid keeps its own numbering: the option is a month's
        model.run("view.set", { type: "week" });
        expect(
            partAttributes(model, "time-grid", {}, numbered)["aria-colcount"],
        ).toBe("7");
        expect(
            partAttributes(model, "day-grid", {}, numbered)["aria-colcount"],
        ).toBeUndefined();
    });
});
