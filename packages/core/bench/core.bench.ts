// @vitest-environment jsdom
// The core's budgets (Issue #24, `pnpm bench`): a week's time grid and a month's day grid read
// from a new state, a drag of 30 previews with an adapter reading every part after each change,
// and a drop. Each budget is the median, about twice the one measured on a developer machine (the
// CI margin; measured in the pull request of Issue #24): a slow phone runs about 4x that machine,
// and Epic #27's goal is at most 8 ms of core work per pointer move there.
import { afterAll, describe, expect, test } from "vitest";
import { dragAndDrop } from "../src/drag-and-drop/index";
import type { CalendarEventJson } from "../src/index";
import { recurrence } from "../src/recurrence/index";
import { resize } from "../src/resize/index";
import { selection } from "../src/selection/index";
import { type Mounted, mount, unmountAll } from "../tests/engine/harness";
import { modelOf, timed } from "../tests/fixture";

afterAll(unmountAll);

/** Budgets, the median milliseconds of a run (measured: 0.06, 0.09, 11 and 6). */
const BUDGET = {
    timeGrid: 0.2,
    dayGrid: 0.2,
    drag: 25,
    drop: 12,
};

/** A busy week: three events a day and a daily recurring one, in the host's zone. */
function events(): CalendarEventJson[] {
    const list: CalendarEventJson[] = [
        timed("standup", "08:30", "09:00", {
            date: "2026-11-22",
            recurrence: { rule: "FREQ=DAILY" },
        }),
    ];
    for (let day = 22; day <= 28; day++) {
        const date = `2026-11-${day}`;
        list.push(
            timed(`a${day}`, "09:00", "10:00", { date }),
            timed(`b${day}`, "11:00", "12:30", { date }),
            timed(`c${day}`, "14:00", "15:00", { date }),
        );
    }
    return list;
}

const features = [dragAndDrop(), resize(), selection(), recurrence()] as const;

function week(): Mounted {
    const m = mount({
        view: { type: "week", anchorDate: "2026-11-26" },
        settings: { timeZone: "local" },
        events: events(),
        features,
    });
    m.engine.adapter.subscribe(() => m.attributesOfAll());
    m.model.subscribe(() => m.attributesOfAll());
    m.attributesOfAll();
    return m;
}

/** The key of the element event `id` shows in (its first). */
function eventKey(m: Mounted, id: string): string {
    const key = [...m.parts().keys()].find((one) =>
        one.startsWith(`event ${id} `),
    );
    if (!key) throw new Error(`event ${id} is not shown`);
    return key;
}

/** A drag of event `id` through 30 targets, released at `to` (or not released). */
function drag(m: Mounted, id: string, to?: { x: number; y: number }): void {
    const dates = ["2026-11-23", "2026-11-24", "2026-11-25"];
    const points = Array.from({ length: 30 }, (_, i) =>
        m.timePoint(
            dates[i % 3] ?? "2026-11-23",
            `${String(10 + Math.floor(i / 3)).padStart(2, "0")}:00`,
        ),
    );
    const key = eventKey(m, id);
    m.drag(m.element(key), m.center(key), to ? [...points, to] : points, false);
}

describe("the core's budgets", () => {
    test("model.get(time-grid) and model.get(day-grid) from a new state", async ({
        bench,
    }) => {
        const timeModel = modelOf(
            events(),
            { timeZone: "local" },
            { view: { type: "week", anchorDate: "2026-11-26" } },
            { features: [recurrence()] },
        );
        const dayModel = modelOf(
            events(),
            { timeZone: "local" },
            { view: { type: "month", anchorDate: "2026-11-26" } },
            { features: [recurrence()] },
        );
        let title = 0;
        const timeGrid = await bench("model.get(time-grid)", () => {
            timeModel.run("event.update", {
                eventId: "a26",
                title: String(title++),
            });
            timeModel.get("time-grid");
        }).run();
        const dayGrid = await bench("model.get(day-grid)", () => {
            dayModel.run("event.update", {
                eventId: "a26",
                title: String(title++),
            });
            dayModel.get("day-grid");
        }).run();
        expect(timeGrid.latency.p50).toBeLessThan(BUDGET.timeGrid);
        expect(dayGrid.latency.p50).toBeLessThan(BUDGET.dayGrid);
    });

    test("a 30-move drag and a drop in a busy week", async ({ bench }) => {
        const m = week();
        const moves = await bench(
            "a 30-move drag (an adapter reading every part)",
            () => {
                drag(m, "a26");
                m.engine.run("cancel-gesture");
            },
        ).run();
        // each drop moves the event between two days, its drag not measured
        let there = false;
        let drops = 0;
        m.model.subscribe(() => drops++);
        const drop = await bench(
            "a drop (an adapter reading every part)",
            {
                beforeEach: () => {
                    there = !there;
                    drag(
                        m,
                        "a26",
                        there
                            ? m.timePoint("2026-11-25", "19:00")
                            : m.timePoint("2026-11-26", "09:00"),
                    );
                },
            },
            () => {
                const at = there
                    ? m.timePoint("2026-11-25", "19:00")
                    : m.timePoint("2026-11-26", "09:00");
                m.pointer("pointerup", at, m.root);
            },
        ).run();
        expect(drops).toBeGreaterThanOrEqual(drop.latency.samplesCount);
        expect(moves.latency.p50).toBeLessThan(BUDGET.drag);
        expect(drop.latency.p50).toBeLessThan(BUDGET.drop);
    });
});
