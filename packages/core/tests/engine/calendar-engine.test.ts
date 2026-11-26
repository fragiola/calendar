// @vitest-environment jsdom
// The engine's core (no feature): its surface, the roving focus and every D12 key, taps, the
// midnight refresh from the injected clock, `dayMaxEvents: "auto"` from measured sizes, and
// hit-testing.
import { afterEach, describe, expect, it } from "vitest";
import { createCalendarEngine, partAttributes } from "../../src/index";
import { allDay, modelOf, timed } from "../fixture";
import { type Mounted, mount, unmountAll } from "./harness";

afterEach(unmountAll);

const focusedKey = () =>
    (document.activeElement as HTMLElement | null)?.dataset.key;

describe("the engine's surface", () => {
    it("is exactly the verbs, plus subscribe, destroy and adapter, each bound and frozen", () => {
        const engine = createCalendarEngine(modelOf());
        expect(Object.keys(engine).sort()).toEqual(
            [
                "adapter",
                "can",
                "check",
                "destroy",
                "get",
                "is",
                "run",
                "subscribe",
            ].sort(),
        );
        expect(Object.isFrozen(engine)).toBe(true);
        expect(Object.keys(engine.adapter).sort()).toEqual(
            [
                "attachRoot",
                "attributes",
                "committed",
                "detachRoot",
                "getSnapshot",
                "model",
                "register",
                "subscribe",
            ].sort(),
        );
        const { get, is } = engine;
        expect(get("focused")).toBeNull();
        expect(is("gesture-active")).toBe(false);
        engine.destroy();
    });

    it("answers an unknown or a missing feature's action without throwing", () => {
        const engine = createCalendarEngine(modelOf());
        const run = engine.run as (action: string, payload?: object) => unknown;
        expect(run("fly")).toMatchObject({
            ok: false,
            error: { code: "unknown_command" },
        });
        expect(run("external-drag-start", { event: {} })).toMatchObject({
            ok: false,
            error: {
                code: "not_found",
                message: expect.stringContaining("external-drop"),
            },
        });
        expect(
            (engine.get as (key: string) => unknown)("drag-preview"),
        ).toBeUndefined();
        engine.destroy();
        expect(engine.run("cancel-gesture")).toMatchObject({
            ok: false,
            error: { code: "refused" },
        });
    });
});

describe("the roving focus (D12)", () => {
    let m: Mounted;

    it("has one tab stop, on today, and moves it with the arrows", () => {
        m = mount({
            events: [allDay("a", "2026-11-26", "2026-11-27")],
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        expect(
            m.engine.adapter.attributes("day", { date: "2026-11-26" }),
        ).toMatchObject({
            "data-calendar-part": "day",
            role: "gridcell",
            tabindex: "0",
            "data-today": "",
        });
        expect(
            m.engine.adapter.attributes("day", { date: "2026-11-25" }),
        ).toMatchObject({ tabindex: "-1" });
        expect(m.engine.get("tab-stop")).toEqual({
            kind: "day",
            date: "2026-11-26",
        });
        expect(m.engine.run("focus", { date: "2026-11-26" }).ok).toBe(true);
        expect(focusedKey()).toBe("day 2026-11-26");
        m.key("ArrowRight");
        expect(focusedKey()).toBe("day 2026-11-27");
        expect(
            m.engine.adapter.attributes("day", { date: "2026-11-27" }),
        ).toMatchObject({ tabindex: "0", "data-focused": "" });
        m.key("ArrowDown");
        expect(focusedKey()).toBe("day 2026-12-04");
        m.key("ArrowUp");
        m.key("ArrowLeft");
        expect(focusedKey()).toBe("day 2026-11-26");
        m.key("Home");
        expect(focusedKey()).toBe("day 2026-11-22");
        m.key("End");
        expect(focusedKey()).toBe("day 2026-11-28");
    });

    it("mirrors the inline arrows right to left, not Home and End", () => {
        m = mount({
            view: { type: "month", anchorDate: "2026-11-26" },
            rtl: true,
        });
        expect(m.engine.get("direction")).toBe("rtl");
        m.engine.run("focus", { date: "2026-11-26" });
        m.key("ArrowRight");
        expect(focusedKey()).toBe("day 2026-11-25");
        m.key("ArrowLeft");
        m.key("ArrowLeft");
        expect(focusedKey()).toBe("day 2026-11-27");
        m.key("Home");
        expect(focusedKey()).toBe("day 2026-11-22");
    });

    it("navigates past the grid: arrows, PageUp/PageDown by a month, Shift by a year", () => {
        m = mount({ view: { type: "month", anchorDate: "2026-11-26" } });
        m.engine.run("focus", { date: "2026-11-26" });
        m.key("PageDown");
        expect(m.model.get("current-range").start).toBe("2026-12-01");
        expect(focusedKey()).toBe("day 2026-12-26");
        m.key("PageUp", { shiftKey: true });
        expect(m.model.get("current-range").start).toBe("2025-12-01");
        expect(focusedKey()).toBe("day 2025-12-26");
        m.key("PageDown", { shiftKey: true });
        m.key("PageUp");
        expect(focusedKey()).toBe("day 2026-11-26");
        // the grid's last row is 2026-12-06 … 12-12; a week down from 12-10 leaves it
        m.engine.run("focus", { date: "2026-12-10" });
        m.key("ArrowDown");
        expect(m.model.get("current-range").start).toBe("2026-12-01");
        expect(focusedKey()).toBe("day 2026-12-17");
    });

    it("lands PageDown on a shown day of the month when the target is hidden", () => {
        m = mount({
            view: { type: "month", anchorDate: "2026-11-26" },
            settings: { hiddenDays: [0, 6] },
        });
        m.engine.run("focus", { date: "2026-11-26" });
        // 2026-12-26 is a Saturday: the next shown day of December
        m.key("PageDown");
        expect(m.model.get("current-range").start).toBe("2026-12-01");
        expect(focusedKey()).toBe("day 2026-12-28");
        // 2027-01-31 is a Sunday whose next shown day leaves January: the previous one
        m.engine.run("focus", { date: "2026-12-31" });
        m.key("PageDown");
        expect(m.model.get("current-range").start).toBe("2027-01-01");
        expect(focusedKey()).toBe("day 2027-01-29");
    });

    it("stays where it is when validRange refuses the navigation", () => {
        m = mount({
            view: { type: "month", anchorDate: "2026-11-26" },
            settings: {
                validRange: { start: "2026-11-01", end: "2026-12-01" },
            },
        });
        m.engine.run("focus", { date: "2026-11-26" });
        m.key("PageDown");
        expect(m.model.get("current-range").start).toBe("2026-11-01");
        expect(focusedKey()).toBe("day 2026-11-26");
        expect(m.engine.run("focus", { date: "2027-01-05" })).toMatchObject({
            ok: false,
            error: { code: "refused" },
        });
    });

    it("enters a cell's events with Enter or F2, moves between them, leaves with Escape", () => {
        m = mount({
            events: [
                allDay("a", "2026-11-26", "2026-11-27"),
                allDay("b", "2026-11-26", "2026-11-27"),
            ],
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        m.engine.run("focus", { date: "2026-11-26" });
        m.key("Enter");
        expect(focusedKey()).toBe("event a 2026-11-26");
        expect(m.engine.get("focused")).toEqual({
            kind: "event",
            occurrenceId: "a",
            cell: { kind: "day", date: "2026-11-26" },
        });
        expect(
            m.engine.adapter.attributes("event", {
                occurrenceId: "a",
                date: "2026-11-26",
            }),
        ).toMatchObject({
            role: "listitem",
            tabindex: "0",
            "data-focused": "",
            "data-event-id": "a",
        });
        expect(
            m.engine.adapter.attributes("day", { date: "2026-11-26" }),
        ).toMatchObject({ tabindex: "-1" });
        m.key("ArrowDown");
        expect(focusedKey()).toBe("event b 2026-11-26");
        m.key("ArrowDown");
        expect(focusedKey()).toBe("event b 2026-11-26");
        m.key("ArrowUp");
        expect(focusedKey()).toBe("event a 2026-11-26");
        m.key("Enter");
        expect(m.events).toContainEqual({
            type: "event-click",
            eventId: "a",
            occurrenceId: "a",
            keyboard: true,
        });
        m.key("Escape");
        expect(focusedKey()).toBe("day 2026-11-26");
        m.key("F2");
        expect(focusedKey()).toBe("event a 2026-11-26");
        // an empty cell has no events to enter: Enter is not taken
        m.key("Escape");
        m.key("ArrowRight");
        expect(m.key("Enter").defaultPrevented).toBe(false);
    });

    it("leaves Tab and the keys with Ctrl, Alt or Meta to the browser", () => {
        m = mount({ view: { type: "month", anchorDate: "2026-11-26" } });
        m.engine.run("focus", { date: "2026-11-26" });
        expect(m.key("Tab").defaultPrevented).toBe(false);
        expect(m.key("ArrowRight", { ctrlKey: true }).defaultPrevented).toBe(
            false,
        );
        expect(focusedKey()).toBe("day 2026-11-26");
    });

    it("moves over the time grid's slots, its all-day row and its columns", () => {
        m = mount({
            events: [timed("t", "09:00", "10:00")],
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        expect(m.engine.get("tab-stop")).toEqual({
            kind: "slot",
            date: "2026-11-26",
            time: "00:00",
        });
        m.engine.run("focus", { date: "2026-11-26", time: "09:00" });
        expect(focusedKey()).toBe("slot 2026-11-26 09:00");
        m.key("ArrowDown");
        expect(focusedKey()).toBe("slot 2026-11-26 09:30");
        m.key("ArrowRight");
        expect(focusedKey()).toBe("slot 2026-11-27 09:30");
        m.key("ArrowLeft");
        m.key("ArrowUp");
        m.key("Enter");
        expect(focusedKey()).toBe("event t 2026-11-26");
        m.key("Escape");
        m.engine.run("focus", { date: "2026-11-26", time: "00:00" });
        m.key("ArrowUp");
        expect(focusedKey()).toBe("day 2026-11-26");
        m.key("ArrowDown");
        expect(focusedKey()).toBe("slot 2026-11-26 00:00");
        m.key("End");
        expect(focusedKey()).toBe("slot 2026-11-28 00:00");
        // PageDown: the next week, the same column; Shift + PageUp: a week back
        m.key("PageDown");
        expect(m.model.get("visible-range")).toEqual({
            start: "2026-11-29",
            end: "2026-12-06",
        });
        expect(focusedKey()).toBe("slot 2026-12-05 00:00");
        m.key("PageUp", { shiftKey: true });
        expect(focusedKey()).toBe("slot 2026-11-28 00:00");
        // past the last column: the next day, in the next week
        m.key("ArrowRight");
        expect(focusedKey()).toBe("slot 2026-11-29 00:00");
    });
});

describe("taps (D14)", () => {
    it("tells an event's, a day's and a slot's click; a press that moved is no tap", () => {
        const m = mount({
            events: [allDay("a", "2026-11-26", "2026-11-27")],
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const event = m.element("event a 2026-11-26");
        m.drag(event, m.center("event a 2026-11-26"), []);
        m.drag(m.element("day 2026-11-24"), m.dayPoint("2026-11-24"), []);
        expect(m.events).toEqual([
            {
                type: "event-click",
                eventId: "a",
                occurrenceId: "a",
                keyboard: false,
            },
            { type: "date-click", date: "2026-11-24", allDay: true },
        ]);
        const start = m.dayPoint("2026-11-24");
        m.drag(m.element("day 2026-11-24"), start, [
            { x: start.x + 10, y: start.y },
        ]);
        expect(m.events).toHaveLength(2);
        // a tap moves the roving focus to its day
        expect(m.engine.get("focused")).toEqual({
            kind: "day",
            date: "2026-11-24",
        });
        expect(focusedKey()).toBe("day 2026-11-24");
        const w = mount({ view: { type: "day", anchorDate: "2026-11-26" } });
        const at = w.timePoint("2026-11-26", "09:40");
        w.drag(w.element("slot 2026-11-26 09:30"), at, []);
        expect(w.events).toEqual([
            {
                type: "date-click",
                date: "2026-11-26",
                allDay: false,
                time: "09:30",
                at: "2026-11-26T09:30:00Z",
            },
        ]);
    });

    it("leaves a press on a control inside an event alone, and a secondary button", () => {
        const m = mount({
            events: [allDay("a", "2026-11-26", "2026-11-27")],
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const button = document.createElement("button");
        button.setAttribute("data-calendar-no-gesture", "");
        m.element("event a 2026-11-26").append(button);
        m.drag(button, m.center("event a 2026-11-26"), []);
        m.pointer(
            "pointerdown",
            m.dayPoint("2026-11-24"),
            m.element("day 2026-11-24"),
            {
                button: 2,
            },
        );
        m.pointer(
            "pointerup",
            m.dayPoint("2026-11-24"),
            m.element("day 2026-11-24"),
        );
        expect(m.events).toEqual([]);
    });
});

describe("hit-testing (D14)", () => {
    it("maps a point to a day, or to a time snapped to snapDuration", () => {
        const m = mount({ view: { type: "month", anchorDate: "2026-11-26" } });
        expect(
            m.engine.get("point-at", { clientX: 450, clientY: 450 }),
        ).toEqual({ kind: "day", date: "2026-11-26" });
        expect(
            m.engine.get("point-at", { clientX: 450, clientY: 50 }),
        ).toBeNull();
        const w = mount({
            view: { type: "week", anchorDate: "2026-11-26" },
            settings: { snapDuration: 15 },
        });
        const at = w.timePoint("2026-11-26", "09:44");
        expect(
            w.engine.get("point-at", { clientX: at.x, clientY: at.y }),
        ).toEqual({
            kind: "time",
            date: "2026-11-26",
            minutes: 570,
            time: "09:30",
            at: "2026-11-26T09:30:00Z",
        });
        expect(w.engine.get("point-at", { clientX: 100, clientY: 25 })).toEqual(
            { kind: "day", date: "2026-11-22" },
        );
    });
});

describe("the midnight refresh (D16)", () => {
    it("moves today at the display zone's midnight, from the injected clock", () => {
        const m = mount({
            view: { type: "month", anchorDate: "2026-11-26" },
            settings: { timeZone: "America/Sao_Paulo" },
        });
        expect(m.model.get("today")).toBe("2026-11-26");
        expect(
            m.engine.adapter.attributes("day", { date: "2026-11-26" }),
        ).toMatchObject({ "data-today": "" });
        // 12:00 UTC is 09:00 in Sao Paulo: midnight there is 15 hours away
        m.test.advance(15 * 3_600_000 - 1000);
        expect(m.events).toEqual([]);
        const before = m.engine.adapter.getSnapshot();
        m.test.advance(2000);
        expect(m.events).toEqual([
            { type: "today-change", today: "2026-11-27" },
        ]);
        expect(m.engine.adapter.getSnapshot()).toBeGreaterThan(before);
        expect(
            m.engine.adapter.attributes("day", { date: "2026-11-27" }),
        ).toMatchObject({ "data-today": "" });
        // and again the next night, scheduled through the host
        m.test.advance(24 * 3_600_000);
        expect(m.events.at(-1)).toEqual({
            type: "today-change",
            today: "2026-11-28",
        });
    });

    it("schedules again when the display zone changes, and stops when destroyed", () => {
        const m = mount({ view: { type: "month", anchorDate: "2026-11-26" } });
        m.model.run("settings.set", { settings: { timeZone: "Asia/Tokyo" } });
        // 12:00 UTC is 21:00 in Tokyo: midnight is 3 hours away
        m.test.advance(3 * 3_600_000 + 1000);
        expect(m.events).toEqual([
            { type: "today-change", today: "2026-11-27" },
        ]);
        m.engine.destroy();
        expect(m.test.timers.size).toBe(0);
    });
});

describe('dayMaxEvents: "auto" (D11)', () => {
    const five = ["a", "b", "c", "d", "e"].map((id) =>
        allDay(id, "2026-11-26", "2026-11-27"),
    );

    it("limits the lanes to what the measured cell holds, one kept for the more link", () => {
        const m = mount({
            events: five,
            settings: { dayMaxEvents: "auto" },
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        // 80 px of room, 20 px events: 4 fit, 5 do not, so 3 show and the link takes the 4th
        expect(m.engine.get("max-lanes")).toBe(3);
        const day = m.engine
            .get("day-grid")
            ?.weeks.flatMap((week) => week.days)
            .find((one) => one.date === "2026-11-26");
        expect(day?.hiddenCount).toBe(2);
        expect(m.has("event d 2026-11-26")).toBe(false);
        expect(m.engine.run("measure")).toEqual({
            ok: true,
            value: { maxLanes: 3 },
        });
    });

    it("lifts the limit when everything fits, and ignores it without the setting", () => {
        const m = mount({
            events: five,
            settings: { dayMaxEvents: "auto" },
            view: { type: "month", anchorDate: "2026-11-26" },
            dayEventsHeight: 120,
        });
        expect(m.engine.get("max-lanes")).toBeNull();
        const n = mount({
            events: five,
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        expect(n.engine.get("max-lanes")).toBeNull();
    });
});

describe("attributes (D17)", () => {
    it("gives every part its name, the model's state and the engine's roles", () => {
        const m = mount({
            events: [timed("t", "09:00", "10:00")],
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        const { attributes } = m.engine.adapter;
        expect(attributes("root", {})).toEqual({
            "data-calendar-part": "root",
            "data-view": "week",
        });
        expect(attributes("time-grid", {})).toEqual({
            "data-calendar-part": "time-grid",
            role: "grid",
        });
        expect(
            attributes("slot", { date: "2026-11-26", time: "09:00" }),
        ).toMatchObject({
            "data-calendar-part": "slot",
            "data-date": "2026-11-26",
            "data-time": "09:00",
            role: "gridcell",
            tabindex: "-1",
        });
        const event = attributes("event", {
            occurrenceId: "t",
            date: "2026-11-26",
        });
        expect(event["data-event-id"]).toBe("t");
        // no drag feature: no touch-action written
        expect(m.element("event t 2026-11-26").style.touchAction).toBe("");
    });

    it("gives a time grid rows of slots, a gridcell per day, and each column's events as a list", () => {
        const m = mount({
            events: [
                timed("t", "09:00", "10:00"),
                allDay("a", "2026-11-26", "2026-11-27"),
            ],
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        const { attributes } = m.engine.adapter;
        const day = { date: "2026-11-26" };
        // the header row and the all-day row come first; then a row per slot, its label a rowheader
        expect(attributes("column-headers", {})).toEqual({
            "data-calendar-part": "column-headers",
            role: "row",
        });
        expect(attributes("column-header", day)).toMatchObject({
            role: "columnheader",
            "data-date": "2026-11-26",
        });
        expect(attributes("all-day-row", { weekId: "2026-11-22" })).toEqual({
            "data-calendar-part": "all-day-row",
            role: "row",
        });
        expect(attributes("day", day)).toMatchObject({ role: "gridcell" });
        expect(attributes("slot-row", { time: "09:00" })).toEqual({
            "data-calendar-part": "slot-row",
            "data-time": "09:00",
            role: "row",
        });
        expect(attributes("slot-label", { time: "09:00" })).toEqual({
            "data-calendar-part": "slot-label",
            "data-time": "09:00",
            role: "rowheader",
        });
        // the column is a positioned layer with no role; its events are a list of list items
        const column = attributes("column", day);
        expect(column.role).toBeUndefined();
        expect(column).toMatchObject({
            "data-calendar-part": "column",
            "data-date": "2026-11-26",
            "data-today": "",
        });
        expect(attributes("column-events", day)).toEqual({
            "data-calendar-part": "column-events",
            "data-date": "2026-11-26",
            role: "list",
        });
        expect(
            attributes("event", { occurrenceId: "t", date: "2026-11-26" }),
        ).toMatchObject({
            "data-calendar-part": "time-event",
            role: "listitem",
            tabindex: "-1",
        });
        expect(
            attributes("event", { occurrenceId: "a", date: "2026-11-26" }),
        ).toMatchObject({ "data-calendar-part": "segment", role: "listitem" });
        // decorations are hidden from assistive technology
        expect(attributes("selection", {})["aria-hidden"]).toBe("true");
        expect(
            attributes("resize-handle", {
                occurrenceId: "t",
                date: "2026-11-26",
                edge: "end",
            })["aria-hidden"],
        ).toBe("true");
    });

    it("names a month's and a list's events, and gives week numbers a rowheader", () => {
        const m = mount({
            events: [timed("t", "09:00", "10:00")],
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const { attributes } = m.engine.adapter;
        expect(
            attributes("event", { occurrenceId: "t", date: "2026-11-26" }),
        ).toMatchObject({ "data-calendar-part": "segment", role: "listitem" });
        expect(attributes("week", { weekId: "2026-11-22" }).role).toBe("row");
        expect(attributes("week-number", { weekId: "2026-11-22" }).role).toBe(
            "rowheader",
        );
        m.model.run("view.set", { type: "list" });
        expect(
            attributes("event", { occurrenceId: "t", date: "2026-11-26" }),
        ).toMatchObject({
            "data-calendar-part": "list-event",
            role: "listitem",
            tabindex: "0",
        });
        expect(attributes("list-day", { date: "2026-11-26" })).toEqual({
            "data-calendar-part": "list-day",
            "data-date": "2026-11-26",
            role: "list",
        });
    });

    it("marks the navigation buttons by what their command can do", () => {
        const m = mount({
            settings: {
                validRange: { start: "2026-11-01", end: "2026-12-01" },
            },
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const { attributes } = m.engine.adapter;
        expect(attributes("previous", {})).toEqual({
            "data-calendar-part": "previous",
            "data-disabled": "",
        });
        expect(attributes("next", {})["data-disabled"]).toBe("");
        expect(attributes("today", {})["data-disabled"]).toBeUndefined();
        expect(attributes("view-button", { type: "month" })).toEqual({
            "data-calendar-part": "view-button",
            "aria-pressed": "true",
            "data-pressed": "",
        });
        expect(attributes("view-button", { type: "week" })).toEqual({
            "data-calendar-part": "view-button",
            "aria-pressed": "false",
        });
        expect(
            attributes("view-button", { type: "days", days: 3 })[
                "aria-pressed"
            ],
        ).toBe("false");
    });
});

describe("partAttributes (before an engine)", () => {
    it("gives what the engine gives while nothing is focused, the tab stop on today", () => {
        const model = modelOf(
            [timed("t", "09:00", "10:00")],
            {},
            {
                view: { type: "week", anchorDate: "2026-11-26" },
            },
        );
        const engine = createCalendarEngine(model);
        const parts = [
            ["root", {}],
            ["time-grid", {}],
            ["slot-row", { time: "00:00" }],
            ["slot", { date: "2026-11-26", time: "00:00" }],
            ["slot", { date: "2026-11-25", time: "00:00" }],
            ["column", { date: "2026-11-26" }],
            ["event", { occurrenceId: "t", date: "2026-11-26" }],
            ["view-button", { type: "week" }],
        ] as const;
        for (const [part, payload] of parts) {
            expect(partAttributes(model, part, payload as never)).toEqual(
                engine.adapter.attributes(part, payload as never),
            );
        }
        expect(
            partAttributes(model, "slot", { date: "2026-11-26", time: "00:00" })
                .tabindex,
        ).toBe("0");
        engine.destroy();
    });
});

describe("buttons inside the root", () => {
    it("leaves a navigation button's keys to it, and takes a \"+N more\" link's Enter as its tap", () => {
        const m = mount({ view: { type: "month", anchorDate: "2026-11-26" } });
        const button = (part: "previous" | "more") => {
            const element = document.createElement("button");
            m.root.append(element);
            m.engine.adapter.register(
                part,
                part === "more" ? { date: "2026-11-26" } : {},
                element,
            );
            element.focus();
            return element;
        };
        // a cell held the focus before
        m.engine.run("focus", { date: "2026-11-25" });
        button("previous");
        expect(m.key("ArrowRight").defaultPrevented).toBe(false);
        expect(m.key("Enter").defaultPrevented).toBe(false);
        expect(m.engine.get("focused")).toEqual({
            kind: "day",
            date: "2026-11-25",
        });
        button("more");
        expect(m.key("Enter").defaultPrevented).toBe(true);
        expect(m.events.at(-1)).toEqual({
            type: "more-click",
            date: "2026-11-26",
            occurrenceIds: [],
        });
    });
});
