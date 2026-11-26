// @vitest-environment jsdom
// `dragAndDrop()`: pointer and keyboard moves (D13, D14), all-day ↔ timed (D10), DST (D4), refused
// targets, every way a drag ends without a command, touch long press, autoscroll, RTL, recurring
// scopes (D15), and the one command a drop runs.
import { afterEach, describe, expect, it } from "vitest";
import { constraints } from "../../src/constraints/index";
import { dragAndDrop } from "../../src/drag-and-drop/index";
import type { CommandEvent } from "../../src/index";
import { recurrence } from "../../src/recurrence/index";
import { type Mounted, mount, unmountAll } from "../engine/harness";
import { allDay, timed } from "../fixture";

afterEach(unmountAll);

function commits(m: Mounted): CommandEvent[] {
    const list: CommandEvent[] = [];
    m.model.subscribe((event) => list.push(event));
    return list;
}

const month = { type: "month", anchorDate: "2026-11-26" } as const;
const week = { type: "week", anchorDate: "2026-11-26" } as const;

describe("a pointer drag (D14)", () => {
    it("starts past the threshold, previews as view state and drops one event.move", () => {
        const m = mount({
            events: [allDay("a", "2026-11-26", "2026-11-27")],
            view: month,
            features: [dragAndDrop()],
        });
        const ran = commits(m);
        const event = m.element("event a 2026-11-26");
        expect(event.style.touchAction).toBe("none");
        const start = m.center("event a 2026-11-26");
        m.pointer("pointerdown", start, event);
        m.pointer("pointermove", { x: start.x + 3, y: start.y }, event);
        expect(m.engine.get("drag-preview")).toBeNull();
        expect(m.engine.is("gesture-active")).toBe(true);
        m.pointer("pointermove", m.dayPoint("2026-11-28"), event);
        const preview = m.engine.get("drag-preview");
        expect(preview).toMatchObject({
            kind: "move",
            keyboard: false,
            eventId: "a",
            occurrenceId: "a",
            start: "2026-11-28",
            end: "2026-11-29",
            allDay: true,
        });
        expect(preview?.weeks).toEqual([
            {
                weekId: "2026-11-22",
                segments: [
                    expect.objectContaining({
                        occurrenceId: "a",
                        startColumn: 6,
                        span: 1,
                    }),
                ],
            },
        ]);
        expect(m.engine.is("event-dragging", { occurrenceId: "a" })).toBe(true);
        expect(
            m.engine.adapter.attributes("event", {
                occurrenceId: "a",
                date: "2026-11-26",
            }),
        ).toMatchObject({ "data-dragging": "" });
        // nothing reached the model while dragging
        expect(ran).toEqual([]);
        m.pointer("pointerup", m.dayPoint("2026-11-28"), event);
        expect(ran).toHaveLength(1);
        expect(ran[0]).toMatchObject({
            command: "event.move",
            payload: { eventId: "a", delta: { days: 2 } },
            transient: false,
        });
        expect(m.model.get("event-by", { id: "a" })?.start).toBe("2026-11-28");
        expect(m.engine.get("drag-preview")).toBeNull();
        expect(m.engine.is("gesture-active")).toBe(false);
        expect(m.events).toContainEqual({
            type: "drop",
            kind: "move",
            eventId: "a",
            occurrenceId: "a",
            start: "2026-11-28",
            end: "2026-11-29",
            allDay: true,
            keyboard: false,
        });
        // a drag is no tap
        expect(m.events.some((one) => one.type === "event-click")).toBe(false);
    });

    it("runs nothing when dropped where it started", () => {
        const m = mount({
            events: [allDay("a", "2026-11-26", "2026-11-27")],
            view: month,
            features: [dragAndDrop()],
        });
        const ran = commits(m);
        const start = m.center("event a 2026-11-26");
        m.drag(m.element("event a 2026-11-26"), start, [
            m.dayPoint("2026-11-28"),
            { x: start.x + 20, y: start.y },
        ]);
        expect(ran).toEqual([]);
        expect(m.events.at(-1)).toEqual({
            type: "announce",
            announcement: { kind: "drag-cancel", occurrenceId: "a" },
        });
    });

    it("moves by whole days keeping the wall clock, vertically by an instant delta (DST)", () => {
        const zone = { timeZone: "America/New_York" };
        const m = mount({
            events: [
                timed(
                    "e",
                    "2026-03-07T09:00:00-05:00",
                    "2026-03-07T10:00:00-05:00",
                ),
                timed(
                    "n",
                    "2026-03-08T01:00:00-05:00",
                    "2026-03-08T01:30:00-05:00",
                ),
            ],
            settings: zone,
            view: { type: "week", anchorDate: "2026-03-08" },
            features: [dragAndDrop()],
        });
        // 2026-03-07 (Saturday) is the week of 03-01; go to it, then drag across to Sunday 03-08
        m.model.run("view.go-to", { date: "2026-03-07" });
        const from = m.timePoint("2026-03-07", "09:10");
        m.drag(m.element("event e 2026-03-07"), from, [
            m.timePoint("2026-03-06", "09:10"),
        ]);
        // a day back, the same 09:00 on the wall clock
        expect(m.model.get("event-by", { id: "e" })).toMatchObject({
            start: "2026-03-06T09:00:00-05:00",
        });
        m.model.run("view.go-to", { date: "2026-03-08" });
        const night = m.timePoint("2026-03-08", "01:05");
        m.drag(m.element("event n 2026-03-08"), night, [
            m.timePoint("2026-03-08", "02:05"),
        ]);
        // one hour on the axis is one hour of time: 01:00 EST + 1 h is 03:00 EDT
        expect(m.model.get("event-by", { id: "n" })).toMatchObject({
            start: "2026-03-08T03:00:00-04:00",
            end: "2026-03-08T03:30:00-04:00",
        });
    });

    it("keeps 09:00 on a day move across the DST change", () => {
        const m = mount({
            events: [
                timed(
                    "e",
                    "2026-03-07T09:00:00-05:00",
                    "2026-03-07T10:00:00-05:00",
                ),
            ],
            settings: { timeZone: "America/New_York", firstDayOfWeek: 6 },
            view: { type: "week", anchorDate: "2026-03-07" },
            features: [dragAndDrop()],
        });
        m.drag(
            m.element("event e 2026-03-07"),
            m.timePoint("2026-03-07", "09:10"),
            [m.timePoint("2026-03-08", "09:10")],
        );
        expect(m.model.get("event-by", { id: "e" })).toMatchObject({
            start: "2026-03-08T09:00:00-04:00",
            end: "2026-03-08T10:00:00-04:00",
        });
    });

    it("turns a timed event all-day on the all-day row, and an all-day one timed in the grid (D10)", () => {
        const m = mount({
            events: [
                timed("t", "09:00", "11:00"),
                allDay("d", "2026-11-24", "2026-11-25"),
            ],
            view: week,
            features: [dragAndDrop()],
        });
        m.drag(
            m.element("event t 2026-11-26"),
            m.timePoint("2026-11-26", "09:10"),
            [m.center("day 2026-11-27")],
        );
        expect(m.model.get("event-by", { id: "t" })).toMatchObject({
            start: "2026-11-27",
            end: "2026-11-28",
            allDay: true,
        });
        m.drag(
            m.element("event d 2026-11-24"),
            m.center("event d 2026-11-24"),
            [m.timePoint("2026-11-25", "14:10")],
        );
        expect(m.model.get("event-by", { id: "d" })).toMatchObject({
            start: "2026-11-25T14:00:00Z",
            end: "2026-11-25T15:00:00Z",
            allDay: false,
        });
    });

    it("mirrors the columns right to left", () => {
        const m = mount({
            events: [allDay("a", "2026-11-26", "2026-11-27")],
            view: month,
            rtl: true,
            features: [dragAndDrop()],
        });
        const event = m.element("event a 2026-11-26");
        const cell = m.dayPoint("2026-11-26");
        // the cell on the left of Thursday is Friday, right to left
        m.drag(event, { x: cell.x, y: cell.y + 20 }, [
            { x: cell.x - 100, y: cell.y },
        ]);
        expect(m.model.get("event-by", { id: "a" })?.start).toBe("2026-11-27");
    });
});

describe("a refused target (D9, D14)", () => {
    it("shows no preview and drops nothing when a constraint refuses the move", () => {
        const m = mount({
            events: [
                allDay("a", "2026-11-26", "2026-11-27"),
                allDay("b", "2026-11-28", "2026-11-29"),
            ],
            settings: { overlap: false },
            view: month,
            features: [dragAndDrop(), constraints()],
        });
        const ran = commits(m);
        const event = m.element("event a 2026-11-26");
        m.pointer("pointerdown", m.center("event a 2026-11-26"), event);
        m.pointer("pointermove", m.dayPoint("2026-11-27"), event);
        expect(m.engine.get("drag-preview")).toMatchObject({
            start: "2026-11-27",
        });
        m.pointer("pointermove", m.dayPoint("2026-11-28"), event);
        expect(m.engine.get("drag-preview")).toBeNull();
        expect(m.events.at(-1)).toEqual({
            type: "announce",
            announcement: {
                kind: "drag-over",
                occurrenceId: "a",
                preview: null,
            },
        });
        m.pointer("pointerup", m.dayPoint("2026-11-28"), event);
        expect(ran).toEqual([]);
        expect(m.engine.is("gesture-active")).toBe(false);
    });

    it("never starts on an event its edit rules keep in place", () => {
        const m = mount({
            events: [
                allDay("a", "2026-11-26", "2026-11-27", {
                    startEditable: false,
                }),
            ],
            view: month,
            features: [dragAndDrop()],
        });
        const ran = commits(m);
        m.drag(
            m.element("event a 2026-11-26"),
            m.center("event a 2026-11-26"),
            [m.dayPoint("2026-11-28")],
        );
        expect(m.engine.get("drag-preview")).toBeNull();
        expect(ran).toEqual([]);
    });

    it("shows no preview outside every grid", () => {
        const m = mount({
            events: [allDay("a", "2026-11-26", "2026-11-27")],
            view: month,
            features: [dragAndDrop()],
        });
        const event = m.element("event a 2026-11-26");
        m.pointer("pointerdown", m.center("event a 2026-11-26"), event);
        m.pointer("pointermove", { x: 450, y: 20 }, event);
        expect(m.engine.get("drag-preview")).toBeNull();
        m.pointer("pointerup", { x: 450, y: 20 }, event);
        expect(m.model.get("event-by", { id: "a" })?.start).toBe("2026-11-26");
    });
});

describe("a drag that ends without a command (D14)", () => {
    const ways: [string, (m: Mounted, event: HTMLElement) => void][] = [
        ["Escape", (m) => m.key("Escape")],
        [
            "pointercancel",
            (m, event) =>
                m.pointer("pointercancel", m.dayPoint("2026-11-28"), event),
        ],
        [
            "a lost capture",
            (m, event) =>
                m.pointer(
                    "lostpointercapture",
                    m.dayPoint("2026-11-28"),
                    event,
                ),
        ],
        [
            "a missed release",
            (m, event) =>
                m.pointer("pointermove", m.dayPoint("2026-11-28"), event, {
                    buttons: 0,
                }),
        ],
        ["cancel-gesture", (m) => m.engine.run("cancel-gesture")],
        ["a detached root", (m) => m.engine.adapter.detachRoot()],
    ];
    for (const [name, end] of ways) {
        it(`ends by ${name}, with no stuck state`, () => {
            const m = mount({
                events: [allDay("a", "2026-11-26", "2026-11-27")],
                view: month,
                features: [dragAndDrop()],
            });
            const ran = commits(m);
            const event = m.element("event a 2026-11-26");
            m.pointer("pointerdown", m.center("event a 2026-11-26"), event);
            m.pointer("pointermove", m.dayPoint("2026-11-28"), event);
            expect(m.engine.get("drag-preview")).not.toBeNull();
            end(m, event);
            expect(m.engine.get("drag-preview")).toBeNull();
            expect(m.engine.is("gesture-active")).toBe(false);
            expect(m.engine.is("event-dragging", { occurrenceId: "a" })).toBe(
                false,
            );
            m.pointer("pointerup", m.dayPoint("2026-11-28"), event);
            expect(ran).toEqual([]);
            // the next drag works
            if (name !== "a detached root") {
                m.drag(event, m.center("event a 2026-11-26"), [
                    m.dayPoint("2026-11-27"),
                ]);
                expect(ran).toHaveLength(1);
            }
        });
    }
});

describe("touch (D14)", () => {
    it("drags after a long press, scrolls (no drag) when it moves first, and taps when released", () => {
        const m = mount({
            events: [allDay("a", "2026-11-26", "2026-11-27")],
            view: month,
            features: [dragAndDrop()],
        });
        const ran = commits(m);
        const event = m.element("event a 2026-11-26");
        const start = m.center("event a 2026-11-26");
        const touch = { pointerType: "touch" };
        // moved before the long press: no drag
        m.pointer("pointerdown", start, event, touch);
        m.pointer("pointermove", m.dayPoint("2026-11-28"), event, touch);
        m.test.advance(600);
        m.pointer("pointermove", m.dayPoint("2026-11-27"), event, touch);
        m.pointer("pointerup", m.dayPoint("2026-11-27"), event, touch);
        expect(ran).toEqual([]);
        expect(m.events).toEqual([]);
        // held 500 ms: it drags
        m.nextPointer();
        m.pointer("pointerdown", start, event, touch);
        m.test.advance(499);
        expect(m.engine.get("drag-preview")).toBeNull();
        m.test.advance(1);
        expect(m.engine.get("drag-preview")).toMatchObject({
            start: "2026-11-26",
        });
        m.pointer("pointermove", m.dayPoint("2026-11-28"), event, touch);
        m.pointer("pointerup", m.dayPoint("2026-11-28"), event, touch);
        expect(ran).toHaveLength(1);
        // a quick touch is a tap
        m.nextPointer();
        const moved = m.element("event a 2026-11-28");
        m.pointer("pointerdown", m.center("event a 2026-11-28"), moved, touch);
        m.pointer("pointerup", m.center("event a 2026-11-28"), moved, touch);
        expect(m.events.at(-1)).toMatchObject({
            type: "event-click",
            eventId: "a",
        });
    });

    it("drags at once when the touched event is focused, and honours longPressDelay", () => {
        const m = mount({
            events: [allDay("a", "2026-11-26", "2026-11-27")],
            view: month,
            features: [dragAndDrop()],
            engine: { longPressDelay: 200 },
        });
        m.engine.run("focus", { occurrenceId: "a" });
        const event = m.element("event a 2026-11-26");
        const touch = { pointerType: "touch" };
        m.pointer("pointerdown", m.center("event a 2026-11-26"), event, touch);
        m.pointer("pointermove", m.dayPoint("2026-11-28"), event, touch);
        expect(m.engine.get("drag-preview")).toMatchObject({
            start: "2026-11-28",
        });
        m.pointer("pointerup", m.dayPoint("2026-11-28"), event, touch);
        m.nextPointer();
        m.engine.run("focus", { date: "2026-11-22" });
        const moved = m.element("event a 2026-11-28");
        m.pointer("pointerdown", m.center("event a 2026-11-28"), moved, touch);
        m.test.advance(200);
        expect(m.engine.get("drag-preview")).not.toBeNull();
        m.key("Escape");
    });
});

describe("autoscroll (D14)", () => {
    it("scrolls the time grid near its edges and moves the preview with it", () => {
        const m = mount({
            events: [timed("t", "09:00", "10:00")],
            view: week,
            features: [dragAndDrop()],
        });
        m.scroller.scrollTop = 400;
        m.render();
        const event = m.element("event t 2026-11-26");
        const start = m.timePoint("2026-11-26", "09:10");
        m.pointer("pointerdown", start, event);
        m.pointer("pointermove", { x: start.x, y: 590 }, event);
        const before = m.engine.get("drag-preview")?.start;
        expect(m.test.frames.size).toBe(1);
        m.test.frame();
        expect(m.scroller.scrollTop).toBeGreaterThan(400);
        m.render();
        m.test.frame();
        expect(m.engine.get("drag-preview")?.start).not.toBe(before);
        // away from the edge: no more frames
        m.pointer("pointermove", start, event);
        m.test.frame();
        expect(m.test.frames.size).toBe(0);
        m.key("Escape");
    });

    it("is off with autoScroll: false", () => {
        const m = mount({
            events: [timed("t", "09:00", "10:00")],
            view: week,
            features: [dragAndDrop()],
            engine: { autoScroll: false },
        });
        m.scroller.scrollTop = 400;
        m.render();
        const event = m.element("event t 2026-11-26");
        const start = m.timePoint("2026-11-26", "09:10");
        m.pointer("pointerdown", start, event);
        m.pointer("pointermove", { x: start.x, y: 590 }, event);
        expect(m.test.frames.size).toBe(0);
    });
});

describe("recurring occurrences (D15)", () => {
    const weekly = timed("w", "09:00", "10:00", {
        date: "2026-11-24",
        recurrence: { rule: "FREQ=DAILY;COUNT=5" },
    });

    it("drops with the occurrence and the scope of recurringScope (default this)", () => {
        const m = mount({
            events: [weekly],
            view: week,
            features: [recurrence(), dragAndDrop()],
        });
        const ran = commits(m);
        const id = "w@2026-11-26T09:00:00Z";
        m.drag(
            m.element(`event ${id} 2026-11-26`),
            m.timePoint("2026-11-26", "09:10"),
            [m.timePoint("2026-11-26", "11:10")],
        );
        expect(ran[0]?.payload).toEqual({
            eventId: "w",
            delta: { minutes: 120 },
            occurrenceId: id,
            scope: "this",
        });
        expect(m.model.get("occurrence-by", { id })).toMatchObject({
            start: "2026-11-26T11:00:00Z",
        });
        expect(
            m.model.get("occurrence-by", { id: "w@2026-11-25T09:00:00Z" }),
        ).toMatchObject({
            start: "2026-11-25T09:00:00Z",
        });
    });

    it("moves the whole series with recurringScope: all", () => {
        const m = mount({
            events: [weekly],
            view: week,
            features: [recurrence(), dragAndDrop({ recurringScope: "all" })],
        });
        const id = "w@2026-11-26T09:00:00Z";
        m.drag(
            m.element(`event ${id} 2026-11-26`),
            m.timePoint("2026-11-26", "09:10"),
            [m.timePoint("2026-11-26", "10:10")],
        );
        expect(m.model.get("event-by", { id: "w" })?.start).toBe(
            "2026-11-24T10:00:00Z",
        );
    });
});

describe("the keyboard (D13)", () => {
    it("grabs with Space, moves with the arrows, drops with Enter, focus following", () => {
        const m = mount({
            events: [allDay("a", "2026-11-26", "2026-11-27")],
            view: month,
            features: [dragAndDrop()],
        });
        const ran = commits(m);
        m.engine.run("focus", { occurrenceId: "a" });
        expect((document.activeElement as HTMLElement).dataset.key).toBe(
            "event a 2026-11-26",
        );
        m.key(" ");
        expect(m.engine.is("event-grabbed", { occurrenceId: "a" })).toBe(true);
        expect(
            m.engine.adapter.attributes("event", {
                occurrenceId: "a",
                date: "2026-11-26",
            }),
        ).toMatchObject({ "data-grabbed": "" });
        expect(m.events).toContainEqual({
            type: "announce",
            announcement: { kind: "grab", occurrenceId: "a" },
        });
        m.key("ArrowRight");
        expect(m.engine.get("drag-preview")).toMatchObject({
            start: "2026-11-27",
            keyboard: true,
        });
        m.key("ArrowDown");
        expect(m.engine.get("drag-preview")).toMatchObject({
            start: "2026-12-04",
        });
        expect(ran).toEqual([]);
        m.key("Enter");
        expect(ran).toHaveLength(1);
        expect(ran[0]?.payload).toEqual({ eventId: "a", delta: { days: 8 } });
        expect(m.engine.is("event-grabbed", { occurrenceId: "a" })).toBe(false);
        // the moved event's new element took focus
        expect((document.activeElement as HTMLElement).dataset.key).toBe(
            "event a 2026-12-04",
        );
        expect(m.engine.get("focused")).toMatchObject({
            kind: "event",
            occurrenceId: "a",
            cell: { kind: "day", date: "2026-12-04" },
        });
    });

    it("moves by a snap step in the time grid, mirrored inline right to left", () => {
        const m = mount({
            events: [timed("t", "09:00", "10:00")],
            view: week,
            rtl: true,
            settings: { snapDuration: 15 },
            features: [dragAndDrop()],
        });
        m.engine.run("focus", { occurrenceId: "t" });
        m.key(" ");
        m.key("ArrowDown");
        m.key("ArrowDown");
        m.key("ArrowLeft");
        expect(m.engine.get("drag-preview")).toMatchObject({
            start: "2026-11-27T09:30:00Z",
        });
        m.key("Enter");
        expect(m.model.get("event-by", { id: "t" })?.start).toBe(
            "2026-11-27T09:30:00Z",
        );
        expect((document.activeElement as HTMLElement).dataset.key).toBe(
            "event t 2026-11-27",
        );
    });

    it("cancels with Escape, and drops nothing on a refused target", () => {
        const m = mount({
            events: [
                allDay("a", "2026-11-26", "2026-11-27"),
                allDay("b", "2026-11-27", "2026-11-28"),
            ],
            settings: { overlap: false },
            view: month,
            features: [dragAndDrop(), constraints()],
        });
        const ran = commits(m);
        m.engine.run("focus", { occurrenceId: "a" });
        m.key(" ");
        m.key("ArrowLeft");
        m.key("Escape");
        expect(m.engine.get("drag-preview")).toBeNull();
        expect(m.engine.is("gesture-active")).toBe(false);
        expect(ran).toEqual([]);
        m.key(" ");
        m.key("ArrowRight");
        expect(m.engine.get("drag-preview")).toBeNull();
        m.key("Enter");
        expect(ran).toEqual([]);
        expect(m.events.at(-1)).toEqual({
            type: "announce",
            announcement: { kind: "drag-cancel", occurrenceId: "a" },
        });
    });

    it("lets go of a grab when focus leaves the calendar", () => {
        const m = mount({
            events: [allDay("a", "2026-11-26", "2026-11-27")],
            view: month,
            features: [dragAndDrop()],
        });
        m.engine.run("focus", { occurrenceId: "a" });
        m.key(" ");
        const outside = document.createElement("button");
        document.body.append(outside);
        outside.focus();
        expect(m.engine.is("event-grabbed", { occurrenceId: "a" })).toBe(false);
    });
});

describe("edge cases", () => {
    it("lands where the pointer is across a spring-forward gap", () => {
        const m = mount({
            events: [
                timed(
                    "n",
                    "2026-03-08T01:00:00-05:00",
                    "2026-03-08T01:30:00-05:00",
                ),
            ],
            settings: { timeZone: "America/New_York" },
            view: { type: "day", anchorDate: "2026-03-08" },
            features: [dragAndDrop()],
        });
        m.drag(
            m.element("event n 2026-03-08"),
            m.timePoint("2026-03-08", "01:05"),
            [m.timePoint("2026-03-08", "04:05")],
        );
        expect(m.model.get("event-by", { id: "n" })?.start).toBe(
            "2026-03-08T04:00:00-04:00",
        );
    });

    it("starts no keyboard grab while a pointer press is under way", () => {
        const m = mount({
            events: [allDay("a", "2026-11-26", "2026-11-27")],
            view: month,
            features: [dragAndDrop()],
        });
        const ran = commits(m);
        m.engine.run("focus", { occurrenceId: "a" });
        const event = m.element("event a 2026-11-26");
        m.pointer("pointerdown", m.center("event a 2026-11-26"), event);
        m.key(" ");
        expect(m.engine.is("event-grabbed", { occurrenceId: "a" })).toBe(false);
        m.pointer("pointermove", m.dayPoint("2026-11-27"), event);
        m.pointer("pointerup", m.dayPoint("2026-11-27"), event);
        m.key("Enter");
        expect(ran).toHaveLength(1);
    });

    it("fires no tap after a touch long press that never moved", () => {
        const m = mount({
            events: [allDay("a", "2026-11-26", "2026-11-27")],
            view: month,
            features: [dragAndDrop()],
        });
        const event = m.element("event a 2026-11-26");
        const at = m.center("event a 2026-11-26");
        m.pointer("pointerdown", at, event, { pointerType: "touch" });
        m.test.advance(500);
        m.pointer("pointerup", at, event, { pointerType: "touch" });
        expect(m.events.some((one) => one.type === "event-click")).toBe(false);
    });
});
