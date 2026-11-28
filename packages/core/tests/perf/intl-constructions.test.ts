// @vitest-environment jsdom
// The `Intl` guard (Issue #24): building an `Intl.DateTimeFormat` costs far more than formatting
// with one (about 0.13 ms, 0.8 ms on a slow phone), and a drag reads the zone, the day and the
// layout thousands of times. A drag of 30 previews and its drop, with an adapter reading every
// part after each change, build at most 10; and only the caching modules build one at all.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dragAndDrop } from "../../src/drag-and-drop/index";
import { recurrence } from "../../src/recurrence/index";
import { resize } from "../../src/resize/index";
import { selection } from "../../src/selection/index";
import { mount, unmountAll } from "../engine/harness";
import { timed } from "../fixture";

const SOURCE = join(import.meta.dirname, "../../src");

/** The files allowed to build an `Intl` object, each keeping what it builds. */
const ALLOWED = [
    "locale/date-time-format.ts", // one formatter per locale, zone and options
    "locale/week-info.ts", // one `Intl.Locale` per locale
    "time-zone/resolve-time-zone.ts", // the host's zone, read once and at the engine's refresh
    "time-zone/time-zone-offset.ts", // one formatter per zone
    "time-zone/validate-time-zone.ts", // one answer per zone name
];

function sources(folder: string): string[] {
    return readdirSync(folder, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
            ? sources(join(folder, entry.name))
            : entry.name.endsWith(".ts")
              ? [join(folder, entry.name)]
              : [],
    );
}

describe("Intl construction", () => {
    const Original = Intl.DateTimeFormat;
    let built = 0;

    beforeEach(() => {
        built = 0;
        Intl.DateTimeFormat = new Proxy(Original, {
            construct(target, args) {
                built++;
                return Reflect.construct(target, args);
            },
        });
    });

    afterEach(() => {
        Intl.DateTimeFormat = Original;
        unmountAll();
    });

    it("happens only in the caching modules", () => {
        const found = sources(SOURCE)
            .filter((file) => /new Intl\.\w+/.test(readFileSync(file, "utf8")))
            .map((file) => relative(SOURCE, file).replaceAll("\\", "/"))
            .sort();
        expect(found).toEqual(ALLOWED);
    });

    it("builds at most 10 formatters for a drag of 30 previews and its drop", () => {
        const m = mount({
            view: { type: "week", anchorDate: "2026-11-26" },
            // the host's zone, and an event in a zone of its own: both are read on every check
            settings: { timeZone: "local" },
            events: [
                timed("a", "09:00", "10:00", { timeZone: "Europe/Paris" }),
                timed("b", "11:00", "12:00", {
                    recurrence: { rule: "FREQ=DAILY;COUNT=5" },
                }),
            ],
            features: [dragAndDrop(), resize(), selection(), recurrence()],
        });
        m.attributesOfAll();
        let previews = 0;
        let preview: unknown = null;
        m.engine.adapter.subscribe(() => {
            const next = m.engine.get("drag-preview");
            if (next !== preview && next !== null) previews++;
            preview = next;
            m.attributesOfAll();
        });
        m.model.subscribe(() => m.attributesOfAll());
        built = 0;
        const dates = ["2026-11-23", "2026-11-24", "2026-11-25"];
        const points = Array.from({ length: 30 }, (_, i) =>
            m.timePoint(
                dates[i % 3] ?? "2026-11-23",
                `${String(10 + Math.floor(i / 3)).padStart(2, "0")}:00`,
            ),
        );
        m.drag(
            m.element("event a 2026-11-26"),
            m.center("event a 2026-11-26"),
            points,
        );
        expect(previews).toBeGreaterThanOrEqual(30);
        expect(m.model.get("event-by", { id: "a" })?.start).not.toBe(
            "2026-11-26T09:00:00Z",
        );
        expect(built).toBeLessThanOrEqual(10);
    });
});
