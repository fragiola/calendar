// The model loads and runs in plain Node (D21, `model-api.md`): no DOM, no jsdom, no global
// window or document, the clock injected.
import { expect, it } from "vitest";
import { createCalendarEngine, createCalendarModel } from "../../src/index";
import { NOW } from "../fixture";

it("loads, runs commands and lays out in plain Node", () => {
    expect(typeof (globalThis as { document?: unknown }).document).toBe(
        "undefined",
    );
    expect(typeof (globalThis as { window?: unknown }).window).toBe(
        "undefined",
    );
    const model = createCalendarModel(
        {
            version: 1,
            events: [
                {
                    title: "Standup",
                    start: "2026-11-26T09:30:00-03:00",
                    end: "2026-11-26T09:45:00-03:00",
                    allDay: false,
                },
            ],
            settings: { timeZone: "America/Sao_Paulo", locale: "pt-BR" },
        },
        { now: () => NOW },
    );
    expect(model.run("view.set", { type: "week" }).ok).toBe(true);
    expect(
        model
            .get("time-grid")
            ?.columns.some((column) => column.segments.length === 1),
    ).toBe(true);
    expect(model.get("day-grid")?.weeks).toHaveLength(1);
    expect(model.get("list").days).toHaveLength(1);
    expect(model.run("view.next", {}).ok).toBe(true);
});

it("creates an engine in plain Node: no DOM until a root is attached, no global timer", () => {
    const model = createCalendarModel(undefined, { now: () => NOW });
    const engine = createCalendarEngine(model);
    expect(engine.get("tab-stop")).toEqual({ kind: "day", date: "2026-11-26" });
    expect(engine.get("direction")).toBe("ltr");
    expect(engine.run("measure")).toEqual({
        ok: true,
        value: { maxLanes: null },
    });
    engine.destroy();
});
