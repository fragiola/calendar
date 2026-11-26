// @vitest-environment jsdom
// `nowIndicator()`: the current time's place in the time grid from the model's clock in the display
// zone, ticked through the injected host's timer on the interval's boundaries (D16).
import { afterEach, describe, expect, it } from "vitest";
import { nowIndicator } from "../../src/now-indicator/index";
import { mount, unmountAll } from "../engine/harness";

afterEach(unmountAll);

describe("nowIndicator()", () => {
    it("places now in today's column, and moves it every minute through the host", () => {
        const m = mount({
            view: { type: "week", anchorDate: "2026-11-26" },
            settings: { timeZone: "America/Sao_Paulo" },
            features: [nowIndicator()],
        });
        // 12:00 UTC is 09:00 in Sao Paulo
        expect(m.engine.get("now-position")).toEqual({
            date: "2026-11-26",
            time: "09:00",
            top: 0.375,
        });
        expect(m.engine.adapter.attributes("now-indicator", {})).toEqual({
            "aria-hidden": "true",
            "data-calendar-part": "now-indicator",
            "data-date": "2026-11-26",
            "data-time": "09:00",
        });
        const before = m.engine.adapter.getSnapshot();
        m.test.advance(59_000);
        expect(m.engine.adapter.getSnapshot()).toBe(before);
        m.test.advance(1000);
        expect(m.engine.adapter.getSnapshot()).toBeGreaterThan(before);
        expect(m.engine.get("now-position")?.time).toBe("09:01");
    });

    it("is null outside the slots shown, in a view without today, and in a month", () => {
        const m = mount({
            view: { type: "week", anchorDate: "2026-11-26" },
            settings: { slotMinTime: "13:00" },
            features: [nowIndicator()],
        });
        expect(m.engine.get("now-position")).toBeNull();
        m.model.run("settings.set", { settings: { slotMinTime: "00:00" } });
        expect(m.engine.get("now-position")).not.toBeNull();
        m.model.run("view.next", {});
        expect(m.engine.get("now-position")).toBeNull();
        m.model.run("view.set", { type: "month" });
        expect(m.engine.get("now-position")).toBeNull();
    });

    it("ticks on its interval and stops with the engine", () => {
        const m = mount({
            view: { type: "day", anchorDate: "2026-11-26" },
            features: [nowIndicator({ interval: 5 * 60_000 })],
        });
        m.test.advance(5 * 60_000);
        expect(m.engine.get("now-position")?.time).toBe("12:05");
        m.engine.destroy();
        expect(m.test.timers.size).toBe(0);
    });
});

it("keeps one tick through a detach and a re-attach (StrictMode)", () => {
    const m = mount({
        view: { type: "week", anchorDate: "2026-11-26" },
        features: [nowIndicator()],
    });
    const timers = m.test.timers.size;
    m.engine.adapter.detachRoot();
    m.engine.adapter.attachRoot(m.root);
    m.engine.adapter.detachRoot();
    m.engine.adapter.attachRoot(m.root);
    expect(m.test.timers.size).toBe(timers);
});
