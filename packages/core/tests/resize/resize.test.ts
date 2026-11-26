// @vitest-environment jsdom
// `resize()`: a resize handle's pointer drag (snapped in the time grid, by days on a day grid), the
// keyboard's Shift + arrows while grabbed (alone, or with drag and drop's moves in one batch),
// refused targets and cancels (D13, D14).
import { afterEach, describe, expect, it } from "vitest";
import { dragAndDrop } from "../../src/drag-and-drop/index";
import type { CommandEvent } from "../../src/index";
import { resize } from "../../src/resize/index";
import { type Mounted, mount, unmountAll } from "../engine/harness";
import { allDay, timed } from "../fixture";

afterEach(unmountAll);

function commits(m: Mounted): CommandEvent[] {
    const list: CommandEvent[] = [];
    m.model.subscribe((event) => list.push(event));
    return list;
}

const week = { type: "week", anchorDate: "2026-11-26" } as const;
const month = { type: "month", anchorDate: "2026-11-26" } as const;

describe("a pointer resize", () => {
    it("moves the end to the snapped slot, previewed, then one event.resize", () => {
        const m = mount({
            events: [timed("t", "09:00", "10:00")],
            view: week,
            settings: { snapDuration: 15 },
            features: [resize()],
        });
        const ran = commits(m);
        const handle = m.element("resize-handle t end 2026-11-26");
        expect(m.element("event t 2026-11-26").style.touchAction).toBe("none");
        m.pointer("pointerdown", m.timePoint("2026-11-26", "09:58"), handle);
        m.pointer("pointermove", m.timePoint("2026-11-26", "10:31"), handle);
        expect(m.engine.get("resize-preview")).toMatchObject({
            kind: "resize",
            start: "2026-11-26T09:00:00Z",
            end: "2026-11-26T10:45:00Z",
        });
        expect(m.engine.is("event-resizing", { occurrenceId: "t" })).toBe(true);
        expect(
            m.engine.adapter.attributes("event", {
                occurrenceId: "t",
                date: "2026-11-26",
            }),
        ).toMatchObject({ "data-resizing": "" });
        // without drag and drop there is no drag-preview key
        expect(
            (m.engine.get as (key: string) => unknown)("drag-preview"),
        ).toBeUndefined();
        m.pointer("pointerup", m.timePoint("2026-11-26", "10:31"), handle);
        expect(ran).toHaveLength(1);
        expect(ran[0]?.payload).toEqual({
            eventId: "t",
            edge: "end",
            to: "2026-11-26T10:45:00Z",
        });
        expect(m.events).toContainEqual(
            expect.objectContaining({
                type: "drop",
                kind: "resize",
                end: "2026-11-26T10:45:00Z",
            }),
        );
    });

    it("refuses an end before the start: no preview, nothing dropped", () => {
        const m = mount({
            events: [timed("t", "09:00", "10:00")],
            view: week,
            features: [resize()],
        });
        const ran = commits(m);
        const handle = m.element("resize-handle t end 2026-11-26");
        m.pointer("pointerdown", m.timePoint("2026-11-26", "09:58"), handle);
        m.pointer("pointermove", m.timePoint("2026-11-26", "08:10"), handle);
        expect(m.engine.get("resize-preview")).toBeNull();
        m.pointer("pointerup", m.timePoint("2026-11-26", "08:10"), handle);
        expect(ran).toEqual([]);
    });

    it("resizes an all-day event by days, and not one whose duration is fixed", () => {
        const m = mount({
            events: [
                allDay("a", "2026-11-23", "2026-11-24"),
                allDay("f", "2026-11-25", "2026-11-26", {
                    durationEditable: false,
                }),
            ],
            view: month,
            features: [resize()],
        });
        const ran = commits(m);
        const handle = m.element("resize-handle a end 2026-11-23");
        m.drag(handle, m.dayPoint("2026-11-23"), [m.dayPoint("2026-11-25")]);
        expect(m.model.get("event-by", { id: "a" })?.end).toBe("2026-11-26");
        const fixed = m.element("resize-handle f end 2026-11-25");
        m.drag(fixed, m.dayPoint("2026-11-25"), [m.dayPoint("2026-11-27")]);
        expect(ran).toHaveLength(1);
        expect(m.engine.get("resize-preview")).toBeNull();
    });

    it("ends with Escape, nothing committed", () => {
        const m = mount({
            events: [timed("t", "09:00", "10:00")],
            view: week,
            features: [resize()],
        });
        const ran = commits(m);
        const handle = m.element("resize-handle t end 2026-11-26");
        m.pointer("pointerdown", m.timePoint("2026-11-26", "09:58"), handle);
        m.pointer("pointermove", m.timePoint("2026-11-26", "11:10"), handle);
        m.key("Escape");
        expect(m.engine.get("resize-preview")).toBeNull();
        m.pointer("pointerup", m.timePoint("2026-11-26", "11:10"), handle);
        expect(ran).toEqual([]);
    });
});

describe("the keyboard (D13)", () => {
    it("Shift + Up/Down move the end in the time grid while grabbed, alone", () => {
        const m = mount({
            events: [timed("t", "09:00", "10:00")],
            view: week,
            features: [resize()],
        });
        m.engine.run("focus", { occurrenceId: "t" });
        m.key(" ");
        expect(
            m.engine.adapter.attributes("event", {
                occurrenceId: "t",
                date: "2026-11-26",
            }),
        ).toMatchObject({ "data-grabbed": "" });
        // plain arrows move nothing without drag and drop
        m.key("ArrowDown");
        expect(m.engine.get("resize-preview")).toBeNull();
        m.key("ArrowDown", { shiftKey: true });
        m.key("ArrowDown", { shiftKey: true });
        expect(m.engine.get("resize-preview")).toMatchObject({
            kind: "resize",
            keyboard: true,
            end: "2026-11-26T11:00:00Z",
        });
        m.key("Enter");
        expect(m.model.get("event-by", { id: "t" })?.end).toBe(
            "2026-11-26T11:00:00Z",
        );
    });

    it("with drag and drop, moves and resizes in one batch", () => {
        const m = mount({
            events: [allDay("a", "2026-11-23", "2026-11-24")],
            view: month,
            features: [dragAndDrop(), resize()],
        });
        const ran = commits(m);
        m.engine.run("focus", { occurrenceId: "a" });
        m.key(" ");
        m.key("ArrowRight");
        m.key("ArrowRight", { shiftKey: true });
        m.key("ArrowRight", { shiftKey: true });
        expect(m.engine.get("drag-preview")).toMatchObject({
            start: "2026-11-24",
            end: "2026-11-27",
        });
        m.key("Enter");
        expect(ran).toHaveLength(1);
        expect(ran[0]?.command).toBe("batch");
        expect(m.model.get("event-by", { id: "a" })).toMatchObject({
            start: "2026-11-24",
            end: "2026-11-27",
        });
    });
});
