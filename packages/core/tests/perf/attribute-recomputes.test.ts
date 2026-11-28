// @vitest-environment jsdom
// Scoped notifies and memoised attributes (Issue #24): an adapter reads every part it shows after
// each view change, and the engine reads again only the parts whose inputs changed. A drag's
// preview moving is a `preview` change that touches no part's attributes; a selection in the
// making changes the cells it enters or leaves; a drag's first move is one change.
import { afterEach, describe, expect, it, vi } from "vitest";
import { dragAndDrop } from "../../src/drag-and-drop/index";
import type { PartAttributes, ViewChange } from "../../src/index";
import { selection } from "../../src/selection/index";
import { type Mounted, mount, unmountAll } from "../engine/harness";
import { timed } from "../fixture";

const counted = vi.hoisted(() => ({ base: 0 }));

vi.mock("../../src/engine/part-attributes", async (original) => {
    const actual =
        await original<typeof import("../../src/engine/part-attributes")>();
    return {
        ...actual,
        baseAttributes: (...args: Parameters<typeof actual.baseAttributes>) => {
            counted.base++;
            return actual.baseAttributes(...args);
        },
    };
});

afterEach(unmountAll);

const week = { type: "week", anchorDate: "2026-11-26" } as const;

/** The parts whose record is a new object since `before`. */
function changed(
    before: Map<string, PartAttributes>,
    after: Map<string, PartAttributes>,
): string[] {
    return [...after]
        .filter(([key, attributes]) => before.get(key) !== attributes)
        .map(([key]) => key)
        .sort();
}

/** Records every view change, and reads every part after each, as an adapter does. */
function follow(m: Mounted) {
    const changes: ViewChange[] = [];
    m.engine.adapter.subscribe((change) => {
        changes.push(change);
        m.attributesOfAll();
    });
    return changes;
}

describe("a part's attributes", () => {
    it("are the same record while nothing they read changed", () => {
        const m = mount({ view: week, events: [timed("a", "09:00", "10:00")] });
        const first = m.attributesOfAll();
        counted.base = 0;
        expect(changed(first, m.attributesOfAll())).toEqual([]);
        expect(counted.base).toBe(0);
    });

    it("are read again from the model only after a commit, keeping the records that did not change", () => {
        const m = mount({
            view: week,
            events: [
                timed("a", "09:00", "10:00"),
                timed("b", "13:00", "14:00"),
            ],
        });
        const before = m.attributesOfAll();
        counted.base = 0;
        expect(
            m.model.run("event.update", { eventId: "a", title: "A" }).ok,
        ).toBe(true);
        const after = m.attributesOfAll();
        expect(counted.base).toBe(after.size);
        // the title is no attribute: every record is kept
        expect(changed(before, after)).toEqual([]);
        expect(m.model.run("event.remove", { eventId: "b" }).ok).toBe(true);
        expect(m.has("event b 2026-11-26")).toBe(false);
        expect(changed(after, m.attributesOfAll())).toEqual([]);
    });
});

describe("a drag's preview", () => {
    it("notifies once on the first move, then only the preview scope, and reads no part again", () => {
        const m = mount({
            view: week,
            events: [timed("a", "09:00", "10:00")],
            features: [dragAndDrop()],
        });
        const changes = follow(m);
        const event = m.element("event a 2026-11-26");
        m.pointer("pointerdown", m.center("event a 2026-11-26"), event);
        expect(changes).toEqual([]);
        // past the threshold: the drag activates, begins and shows its preview, told once
        m.pointer("pointermove", m.timePoint("2026-11-26", "11:00"), event);
        expect(changes).toEqual([
            {
                focus: false,
                gesture: true,
                preview: true,
                selection: false,
                layout: false,
            },
        ]);
        expect(m.engine.get("drag-preview")).not.toBeNull();
        const during = m.attributesOfAll();
        expect(during.get("event a 2026-11-26")).toMatchObject({
            "data-dragging": "",
        });
        counted.base = 0;
        changes.length = 0;
        for (const time of ["12:00", "13:00", "14:00", "15:00"]) {
            m.pointer("pointermove", m.timePoint("2026-11-24", time), event);
        }
        expect(changes).toHaveLength(4);
        for (const change of changes) {
            expect(change).toEqual({
                focus: false,
                gesture: false,
                preview: true,
                selection: false,
                layout: false,
            });
            expect(m.engine.adapter.affects(change, "slot")).toBe(false);
            expect(m.engine.adapter.affects(change, "event")).toBe(false);
            expect(m.engine.adapter.affects(change, "drag-preview")).toBe(true);
        }
        expect(counted.base).toBe(0);
        expect(changed(during, m.attributesOfAll())).toEqual([]);
    });
});

describe("a selection in the making", () => {
    it("reads again only the cells it enters or leaves, none from the model", () => {
        const m = mount({ view: week, features: [selection()] });
        const changes = follow(m);
        const from = m.element("slot 2026-11-24 09:00");
        m.pointer("pointerdown", m.timePoint("2026-11-24", "09:00"), from);
        m.pointer("pointermove", m.timePoint("2026-11-24", "10:00"), from);
        const before = m.attributesOfAll();
        expect(before.get("slot 2026-11-24 09:30")).toMatchObject({
            "data-selected": "",
            "aria-selected": "true",
        });
        counted.base = 0;
        changes.length = 0;
        m.pointer("pointermove", m.timePoint("2026-11-24", "11:00"), from);
        expect(changes).toHaveLength(1);
        expect(changes[0]).toMatchObject({ selection: true, preview: false });
        expect(m.engine.adapter.affects(changes[0] as ViewChange, "slot")).toBe(
            true,
        );
        expect(
            m.engine.adapter.affects(changes[0] as ViewChange, "column"),
        ).toBe(false);
        expect(counted.base).toBe(0);
        // the two slots it entered: 10:30 and 11:00 (10:00 was in already)
        expect(changed(before, m.attributesOfAll())).toEqual([
            "slot 2026-11-24 10:30",
            "slot 2026-11-24 11:00",
        ]);
    });
});

describe("the focus", () => {
    it("reads again only the cells it leaves and enters", () => {
        const m = mount({ view: week, events: [timed("a", "09:00", "10:00")] });
        m.engine.run("focus", { date: "2026-11-24", time: "09:00" });
        const before = m.attributesOfAll();
        counted.base = 0;
        m.engine.run("focus", { date: "2026-11-25", time: "09:00" });
        expect(counted.base).toBe(0);
        expect(changed(before, m.attributesOfAll())).toEqual([
            "slot 2026-11-24 09:00",
            "slot 2026-11-25 09:00",
        ]);
    });
});
