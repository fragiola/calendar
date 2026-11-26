// @vitest-environment jsdom
// `selection()`: the commands and their rules (model state, not document), `data-selected`, the
// pointer selection over days and slots (`selectMinDistance`, refused ranges, cancels), the
// keyboard's Shift + arrows and Enter (D13), and `selectConstraint` with `constraints()`.
import { afterEach, describe, expect, it } from "vitest";
import { constraints } from "../../src/constraints/index";
import { selection } from "../../src/selection/index";
import { mount, unmountAll } from "../engine/harness";
import { modelOf } from "../fixture";

afterEach(unmountAll);

const month = { type: "month", anchorDate: "2026-11-26" } as const;
const week = { type: "week", anchorDate: "2026-11-26" } as const;

describe("the selection's commands", () => {
    it("sets and clears a range, model state that stays out of the document", () => {
        const model = modelOf([], {}, {}, { features: [selection()] });
        expect(model.get("selected-range")).toBeNull();
        expect(
            model.run("selection.set", {
                start: "2026-11-24",
                end: "2026-11-26",
                allDay: true,
            }),
        ).toEqual({
            ok: true,
            value: { start: "2026-11-24", end: "2026-11-26", allDay: true },
        });
        expect(model.state.selection).toEqual({
            start: "2026-11-24",
            end: "2026-11-26",
            allDay: true,
        });
        expect(model.get("calendar-json")).not.toHaveProperty("selection");
        expect(
            model.get("day-attributes-by", { date: "2026-11-25" }),
        ).toMatchObject({
            "data-selected": "",
        });
        expect(
            model.get("day-attributes-by", { date: "2026-11-26" })?.[
                "data-selected"
            ],
        ).toBeUndefined();
        expect(model.run("selection.clear", {})).toEqual({
            ok: true,
            value: { cleared: true },
        });
        expect(model.run("selection.clear", {})).toEqual({
            ok: true,
            value: { cleared: false },
        });
    });

    it("marks the slots a timed range covers", () => {
        const model = modelOf([], {}, {}, { features: [selection()] });
        model.run("selection.set", {
            start: "2026-11-26T09:00:00Z",
            end: "2026-11-26T10:00:00Z",
            allDay: false,
        });
        const slot = (time: string) =>
            model.get("slot-attributes-by", { date: "2026-11-26", time })?.[
                "data-selected"
            ];
        expect([
            slot("08:30"),
            slot("09:00"),
            slot("09:30"),
            slot("10:00"),
        ]).toEqual([undefined, "", "", undefined]);
    });

    it("refuses nonsense, a range outside validRange, and what selectConstraint refuses", () => {
        const model = modelOf(
            [],
            {
                validRange: { start: "2026-11-01", end: "2026-12-01" },
                selectConstraint: [{ start: "2026-11-10", end: "2026-11-20" }],
            },
            {},
            { features: [selection(), constraints()] },
        );
        expect(
            model.run("selection.set", {
                start: "2026-11-12",
                end: "2026-11-12",
                allDay: true,
            }),
        ).toMatchObject({
            ok: false,
            error: { code: "invalid_payload", path: "/end" },
        });
        expect(
            model.run("selection.set", {
                start: "2026-11-12T09:00:00Z",
                end: "2026-11-13",
                allDay: true,
            }),
        ).toMatchObject({ ok: false, error: { code: "invalid_payload" } });
        expect(
            model.run("selection.set", {
                start: "2026-11-30",
                end: "2026-12-02",
                allDay: true,
            }),
        ).toMatchObject({ ok: false, error: { code: "refused" } });
        expect(
            model.check("selection.set", {
                start: "2026-11-18",
                end: "2026-11-22",
                allDay: true,
            }),
        ).toMatchObject({ ok: false, error: { code: "refused" } });
        expect(
            model.can("selection.set", {
                start: "2026-11-12",
                end: "2026-11-14",
                allDay: true,
            }),
        ).toBe(true);
    });

    it("is not_found without the feature", () => {
        const model = modelOf();
        expect(
            (model.run as (c: string, p: object) => unknown)(
                "selection.set",
                {},
            ),
        ).toMatchObject({ ok: false, error: { code: "not_found" } });
    });
});

describe("a pointer selection (D14)", () => {
    it("selects the days between the press and the release, one command on release", () => {
        const m = mount({ view: month, features: [selection()] });
        const ran: string[] = [];
        m.model.subscribe((event) => ran.push(event.command));
        const day = m.element("day 2026-11-24");
        m.pointer("pointerdown", m.dayPoint("2026-11-24"), day);
        m.pointer("pointermove", m.dayPoint("2026-11-26"), day);
        expect(m.engine.get("selection-preview")).toEqual({
            start: "2026-11-24",
            end: "2026-11-27",
            allDay: true,
        });
        expect(
            m.engine.adapter.attributes("day", { date: "2026-11-25" }),
        ).toMatchObject({
            "data-selected": "",
        });
        expect(ran).toEqual([]);
        m.pointer("pointerup", m.dayPoint("2026-11-26"), day);
        expect(ran).toEqual(["selection.set"]);
        expect(m.model.get("selected-range")).toEqual({
            start: "2026-11-24",
            end: "2026-11-27",
            allDay: true,
        });
        expect(m.events.at(-1)).toEqual({
            type: "select",
            range: { start: "2026-11-24", end: "2026-11-27", allDay: true },
            keyboard: false,
        });
        expect(m.engine.get("selection-preview")).toBeNull();
    });

    it("selects a click's day (selectMinDistance 0) and tells the click too", () => {
        const m = mount({ view: month, features: [selection()] });
        m.drag(m.element("day 2026-11-24"), m.dayPoint("2026-11-24"), []);
        expect(m.model.get("selected-range")).toEqual({
            start: "2026-11-24",
            end: "2026-11-25",
            allDay: true,
        });
        expect(m.events.map((event) => event.type)).toEqual([
            "select",
            "date-click",
        ]);
    });

    it("waits for selectMinDistance before selecting", () => {
        const m = mount({
            view: month,
            features: [selection({ selectMinDistance: 20 })],
        });
        const at = m.dayPoint("2026-11-24");
        m.drag(m.element("day 2026-11-24"), at, [{ x: at.x + 10, y: at.y }]);
        expect(m.model.get("selected-range")).toBeNull();
        m.drag(m.element("day 2026-11-24"), at, [m.dayPoint("2026-11-25")]);
        expect(m.model.get("selected-range")).toMatchObject({
            end: "2026-11-26",
        });
    });

    it("selects time snapped to snapDuration, up the column too", () => {
        const m = mount({
            view: week,
            features: [selection()],
            settings: { snapDuration: 15 },
        });
        const slot = m.element("slot 2026-11-26 10:00");
        m.drag(slot, m.timePoint("2026-11-26", "10:20"), [
            m.timePoint("2026-11-26", "09:05"),
        ]);
        expect(m.model.get("selected-range")).toEqual({
            start: "2026-11-26T09:00:00Z",
            end: "2026-11-26T10:30:00Z",
            allDay: false,
        });
        expect(
            m.engine.adapter.attributes("slot", {
                date: "2026-11-26",
                time: "09:30",
            }),
        ).toMatchObject({ "data-selected": "" });
    });

    it("shows nothing for a range selectConstraint refuses, and ends on Escape", () => {
        const m = mount({
            view: month,
            settings: {
                selectConstraint: [{ start: "2026-11-23", end: "2026-11-26" }],
            },
            features: [selection(), constraints()],
        });
        const day = m.element("day 2026-11-24");
        m.pointer("pointerdown", m.dayPoint("2026-11-24"), day);
        m.pointer("pointermove", m.dayPoint("2026-11-27"), day);
        expect(m.engine.get("selection-preview")).toBeNull();
        m.pointer("pointermove", m.dayPoint("2026-11-25"), day);
        expect(m.engine.get("selection-preview")).toMatchObject({
            end: "2026-11-26",
        });
        m.key("Escape");
        expect(m.engine.get("selection-preview")).toBeNull();
        m.pointer("pointerup", m.dayPoint("2026-11-25"), day);
        expect(m.model.get("selected-range")).toBeNull();
    });
});

describe("the keyboard (D13)", () => {
    it("grows a range with Shift + arrows from the focused cell and confirms with Enter", () => {
        const m = mount({ view: month, features: [selection()] });
        m.engine.run("focus", { date: "2026-11-24" });
        m.key("ArrowRight", { shiftKey: true });
        m.key("ArrowRight", { shiftKey: true });
        expect(m.engine.get("selection-preview")).toEqual({
            start: "2026-11-24",
            end: "2026-11-27",
            allDay: true,
        });
        expect((document.activeElement as HTMLElement).dataset.key).toBe(
            "day 2026-11-26",
        );
        expect(m.events.at(-1)).toEqual({
            type: "announce",
            announcement: {
                kind: "select-extend",
                range: { start: "2026-11-24", end: "2026-11-27", allDay: true },
            },
        });
        m.key("ArrowLeft", { shiftKey: true });
        m.key("Enter");
        expect(m.model.get("selected-range")).toEqual({
            start: "2026-11-24",
            end: "2026-11-26",
            allDay: true,
        });
        expect(m.events.at(-1)).toMatchObject({
            type: "select",
            keyboard: true,
        });
        // Escape clears the selection
        m.key("Escape");
        expect(m.model.get("selected-range")).toBeNull();
    });

    it("selects slots in the time grid, and an arrow without Shift drops the range", () => {
        const m = mount({ view: week, features: [selection()] });
        m.engine.run("focus", { date: "2026-11-26", time: "09:00" });
        m.key("ArrowDown", { shiftKey: true });
        expect(m.engine.get("selection-preview")).toEqual({
            start: "2026-11-26T09:00:00Z",
            end: "2026-11-26T10:00:00Z",
            allDay: false,
        });
        m.key("ArrowDown");
        expect(m.engine.get("selection-preview")).toBeNull();
        expect((document.activeElement as HTMLElement).dataset.key).toBe(
            "slot 2026-11-26 10:00",
        );
    });
});

describe("the selection's highlight", () => {
    it("lays out the selected range as an event: time-grid fractions, day-grid segments", () => {
        const m = mount({ view: week, features: [selection()] });
        expect(m.engine.get("selection-segments")).toBeNull();
        m.model.run("selection.set", {
            start: "2026-11-26T09:00:00Z",
            end: "2026-11-26T10:30:00Z",
            allDay: false,
        });
        const shown = m.engine.get("selection-segments");
        expect(shown?.columns).toHaveLength(1);
        expect(shown?.columns[0]).toMatchObject({
            date: "2026-11-26",
            segments: [{ top: 0.375, height: 0.0625 }],
        });
        // the same object while the range stays
        expect(m.engine.get("selection-segments")).toBe(shown);
        m.model.run("selection.set", {
            start: "2026-11-24",
            end: "2026-11-26",
            allDay: true,
        });
        expect(m.engine.get("selection-segments")?.weeks[0]).toMatchObject({
            weekId: "2026-11-22",
            segments: [{ startColumn: 2, span: 2 }],
        });
    });
});
