// @vitest-environment jsdom
// `externalDrop()`: its requirement, an app-driven pointer drag through the engine actions
// (previewed like a drag, `model.can` per target, one `event.add`), and native HTML5 drops of
// foreign content (D14).
import { afterEach, describe, expect, it } from "vitest";
import { constraints } from "../../src/constraints/index";
import { dragAndDrop } from "../../src/drag-and-drop/index";
import { externalDrop } from "../../src/external-drop/index";
import type { CommandEvent } from "../../src/index";
import { type Mounted, mount, unmountAll } from "../engine/harness";
import { allDay, modelOf } from "../fixture";

afterEach(unmountAll);

function commits(m: Mounted): CommandEvent[] {
    const list: CommandEvent[] = [];
    m.model.subscribe((event) => list.push(event));
    return list;
}

/** A native drag event (jsdom has no DragEvent), with its data. */
function nativeDrag(
    m: Mounted,
    type: string,
    at: { x: number; y: number },
    data: Record<string, string> = { "text/plain": "Lunch" },
) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    const dataTransfer = {
        types: Object.keys(data),
        getData: (format: string) => data[format] ?? "",
    };
    Object.assign(event, {
        clientX: at.x,
        clientY: at.y,
        dataTransfer,
        relatedTarget: null,
    });
    m.root.dispatchEvent(event);
    return event;
}

describe("externalDrop()", () => {
    it("requires drag and drop, naming both", () => {
        expect(() =>
            modelOf([], {}, {}, { features: [externalDrop()] }),
        ).toThrow(
            'feature "external-drop" requires feature "drag-and-drop": install it too',
        );
    });

    it("drags an outside event over the grid and drops one event.add", () => {
        const m = mount({
            view: { type: "week", anchorDate: "2026-11-26" },
            features: [dragAndDrop(), externalDrop()],
        });
        const ran = commits(m);
        expect(
            m.engine.run("external-drag-start", {
                event: { title: "Lunch", duration: { minutes: 45 } },
            }),
        ).toEqual({ ok: true, value: {} });
        const at = m.timePoint("2026-11-26", "12:10");
        expect(
            m.engine.run("external-drag-move", {
                clientX: at.x,
                clientY: at.y,
            }),
        ).toMatchObject({
            ok: true,
            value: { point: { kind: "time", time: "12:00" } },
        });
        expect(m.engine.get("drag-preview")).toMatchObject({
            kind: "external",
            eventId: null,
            start: "2026-11-26T12:00:00Z",
            end: "2026-11-26T12:45:00Z",
            allDay: false,
            columns: [{ date: "2026-11-26", segments: [expect.anything()] }],
        });
        expect(ran).toEqual([]);
        const dropped = m.engine.run("external-drag-end", {});
        expect(dropped.ok && dropped.value.eventId).toBe("event-1");
        expect(ran).toHaveLength(1);
        expect(ran[0]).toMatchObject({
            command: "event.add",
            payload: {
                title: "Lunch",
                start: "2026-11-26T12:00:00Z",
                end: "2026-11-26T12:45:00Z",
                allDay: false,
            },
        });
        expect(m.events.at(-1)).toMatchObject({
            type: "external-drop",
            eventId: "event-1",
        });
        expect(m.engine.get("drag-preview")).toBeNull();
    });

    it("drops an all-day event on a day, and nothing on a refused target or a cancel", () => {
        const m = mount({
            events: [allDay("b", "2026-11-27", "2026-11-28")],
            settings: { overlap: false },
            view: { type: "month", anchorDate: "2026-11-26" },
            features: [dragAndDrop(), externalDrop(), constraints()],
        });
        const ran = commits(m);
        m.engine.run("external-drag-start", { event: { title: "Trip" } });
        const busy = m.dayPoint("2026-11-27");
        m.engine.run("external-drag-move", {
            clientX: busy.x,
            clientY: busy.y,
        });
        expect(m.engine.get("drag-preview")).toBeNull();
        expect(m.engine.run("external-drag-end", {})).toEqual({
            ok: true,
            value: { eventId: null },
        });
        expect(ran).toEqual([]);
        m.engine.run("external-drag-start", { event: { title: "Trip" } });
        const free = m.dayPoint("2026-11-24");
        m.engine.run("external-drag-move", {
            clientX: free.x,
            clientY: free.y,
        });
        m.engine.run("external-drag-end", { cancel: true });
        expect(ran).toEqual([]);
        m.engine.run("external-drag-start", {
            event: { title: "Trip", duration: { days: 2 } },
        });
        m.engine.run("external-drag-move", {
            clientX: free.x,
            clientY: free.y,
        });
        m.engine.run("external-drag-end", {});
        expect(ran[0]?.payload).toMatchObject({
            title: "Trip",
            start: "2026-11-24",
            end: "2026-11-26",
            allDay: true,
        });
        expect(
            m.engine.run("external-drag-move", { clientX: 1, clientY: 1 }),
        ).toMatchObject({
            ok: false,
            error: { code: "refused" },
        });
    });

    it("takes a native drop: the app's draft adds an event, or the drop is the app's", () => {
        const m = mount({
            view: { type: "month", anchorDate: "2026-11-26" },
            features: [
                dragAndDrop(),
                externalDrop({
                    accept: (types) => types.includes("text/plain"),
                    draft: (data) =>
                        data.getData("text/plain") === "skip"
                            ? null
                            : { title: data.getData("text/plain") },
                }),
            ],
        });
        const ran = commits(m);
        const at = m.dayPoint("2026-11-25");
        expect(nativeDrag(m, "dragover", at).defaultPrevented).toBe(true);
        expect(
            nativeDrag(m, "dragover", at, { Files: "" }).defaultPrevented,
        ).toBe(false);
        expect(nativeDrag(m, "drop", at).defaultPrevented).toBe(true);
        expect(ran[0]?.payload).toMatchObject({
            title: "Lunch",
            start: "2026-11-25",
            allDay: true,
        });
        expect(m.events.at(-1)).toMatchObject({
            type: "external-drop",
            eventId: "event-1",
            point: { kind: "day", date: "2026-11-25" },
            types: ["text/plain"],
        });
        nativeDrag(m, "drop", at, { "text/plain": "skip" });
        expect(ran).toHaveLength(1);
        expect(m.events.at(-1)).toMatchObject({
            type: "external-drop",
            eventId: null,
            dataTransfer: expect.anything(),
        });
    });
});
