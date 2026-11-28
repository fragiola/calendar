// @vitest-environment jsdom
// The host's zone is read once and kept (Issue #24), so a `"local"` display zone costs nothing per
// read; the engine reads it again at its midnight refresh (D16), on its injected host's timer and
// the model's clock: "today" and the layout follow a host whose zone changed, from that refresh on.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    refreshHostTimeZone,
    resolveTimeZone,
} from "../../src/time-zone/resolve-time-zone";
import { type Mounted, mount, unmountAll } from "../engine/harness";
import { timed } from "../fixture";

const Original = Intl.DateTimeFormat;
/** The zone the host reports (`new Intl.DateTimeFormat().resolvedOptions().timeZone`). */
let host = "UTC";

beforeEach(() => {
    host = "UTC";
    Intl.DateTimeFormat = new Proxy(Original, {
        construct(target, args) {
            const format = Reflect.construct(
                target,
                args,
            ) as Intl.DateTimeFormat;
            if (args.length > 0) return format;
            const options = format.resolvedOptions();
            format.resolvedOptions = () => ({ ...options, timeZone: host });
            return format;
        },
    });
    refreshHostTimeZone();
});

afterEach(() => {
    unmountAll();
    Intl.DateTimeFormat = Original;
    refreshHostTimeZone();
});

const week = { type: "week", anchorDate: "2026-11-26" } as const;

/** Where the time grid shows event "a" on 2026-11-26, as a fraction of the day. */
function topOf(m: Mounted): number | undefined {
    return m.model
        .get("time-grid")
        ?.columns.find((column) => column.date === "2026-11-26")
        ?.segments.find((segment) => segment.occurrenceId === "a")?.top;
}

describe("the host's zone", () => {
    it("is read once, not on every read", () => {
        expect(resolveTimeZone("local")).toBe("UTC");
        host = "Asia/Tokyo";
        expect(resolveTimeZone("local")).toBe("UTC");
        expect(resolveTimeZone("Europe/Paris")).toBe("Europe/Paris");
        expect(refreshHostTimeZone()).toBe(true);
        expect(resolveTimeZone("local")).toBe("Asia/Tokyo");
        expect(refreshHostTimeZone()).toBe(false);
    });

    it("is read again at the engine's midnight refresh: today and the layout follow it", () => {
        // 2026-11-26 12:00 UTC
        const m = mount({
            view: week,
            settings: { timeZone: "local" },
            events: [timed("a", "09:00", "10:00")],
        });
        const layouts: number[] = [];
        m.engine.adapter.subscribe((change) => {
            if (change.layout) layouts.push(m.test.clock);
        });
        expect(m.model.get("today")).toBe("2026-11-26");
        expect(topOf(m)).toBeCloseTo(9 / 24);
        // the host moves to UTC+14, where it is already 02:00 on the 27th: nothing reads it yet
        host = "Pacific/Kiritimati";
        expect(m.model.get("today")).toBe("2026-11-26");
        expect(
            m.engine.adapter.attributes("day", { date: "2026-11-26" }),
        ).toMatchObject({ "data-today": "" });
        // the refresh scheduled for UTC's midnight reads the new zone
        m.test.advance(12 * 3_600_000 + 1000);
        expect(layouts).toHaveLength(1);
        expect(m.events).toContainEqual({
            type: "today-change",
            today: "2026-11-27",
        });
        // 00:00 UTC on the 27th is 14:00 there
        expect(m.model.get("today")).toBe("2026-11-27");
        expect(
            m.engine.adapter.attributes("day", { date: "2026-11-27" }),
        ).toMatchObject({ "data-today": "" });
        // 09:00 UTC is 23:00 there
        expect(topOf(m)).toBeCloseTo(23 / 24);
        // and the next refresh is at the new zone's midnight: 10 hours later
        m.test.advance(10 * 3_600_000 - 2000);
        expect(m.model.get("today")).toBe("2026-11-27");
        m.test.advance(2000);
        expect(m.events).toContainEqual({
            type: "today-change",
            today: "2026-11-28",
        });
    });

    it("tells the adapters when it changed without a new day", () => {
        const m = mount({
            view: week,
            settings: { timeZone: "local" },
            events: [timed("a", "09:00", "10:00")],
        });
        const changes: boolean[] = [];
        m.engine.adapter.subscribe((change) => changes.push(change.layout));
        // UTC-1: at UTC's midnight it is still 23:00 on the 26th there
        host = "Etc/GMT+1";
        m.test.advance(12 * 3_600_000 + 1000);
        expect(m.model.get("today")).toBe("2026-11-26");
        expect(m.events).toEqual([]);
        expect(changes).toEqual([true]);
        expect(topOf(m)).toBeCloseTo(8 / 24);
        // the next refresh is at its midnight, an hour later
        m.test.advance(3_600_000);
        expect(m.events).toEqual([
            { type: "today-change", today: "2026-11-27" },
        ]);
    });

    it("is read again when an engine is created", () => {
        host = "Asia/Tokyo";
        expect(resolveTimeZone("local")).toBe("UTC");
        const m = mount({ view: week, settings: { timeZone: "local" } });
        expect(resolveTimeZone("local")).toBe("Asia/Tokyo");
        // 12:00 UTC is 21:00 in Tokyo
        expect(m.model.get("today")).toBe("2026-11-26");
    });
});
