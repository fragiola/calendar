// The package's surface (packages/react's, for Vue): every React primitive and hook by the same
// file name, the whole core re-exported, the documented runtime API besides it, no shadowed core
// name, each feature from its own entry, no `any`, no CSS or text shipped, and no calendar rule
// re-implemented (the adapter renders and wires: dates, times and layout are the core's keys).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import * as core from "@fragiola/calendar";
import { describe, expect, it } from "vitest";
import { codeOnly } from "../../../scripts/check-dts.ts";
import { exportedNames } from "../../../scripts/exported-names.ts";
import * as constraintsEntry from "../src/constraints";
import * as dragAndDropEntry from "../src/drag-and-drop";
import * as eventSourcesEntry from "../src/event-sources";
import * as externalDropEntry from "../src/external-drop";
import * as vue from "../src/index";
import * as nowIndicatorEntry from "../src/now-indicator";
import * as recurrenceEntry from "../src/recurrence";
import * as resizeEntry from "../src/resize";
import * as selectionEntry from "../src/selection";

const read = (path: string) =>
    readFileSync(join(import.meta.dirname, "..", path), "utf-8");

function sources(dir: string): string[] {
    return readdirSync(join(import.meta.dirname, "..", dir)).flatMap((name) => {
        const path = `${dir}/${name}`;
        return statSync(join(import.meta.dirname, "..", path)).isDirectory()
            ? sources(path)
            : [path];
    });
}

/** The package's own runtime exports: the documented API. */
const OWN = [
    "Calendar",
    "createCalendarRef",
    "useCalendar",
    "useCalendarRef",
    "useCalendarTitle",
    "useCalendarView",
    "useDay",
    "useDayGrid",
    "useDayHeader",
    "useListEvent",
    "useListLayout",
    "useSegment",
    "useSlot",
    "useSlotLabel",
    "useTimeEvent",
    "useTimeGrid",
    "typedCalendar",
];

/** The primitives of the `Calendar` namespace (AGENTS.md, "The primitive contract"). */
const PRIMITIVES = [
    "AllDayRow",
    "Column",
    "ColumnEvents",
    "ColumnHeader",
    "ColumnHeaders",
    "Columns",
    "Day",
    "DayEvents",
    "DayGrid",
    "Days",
    "List",
    "ListDay",
    "ListDays",
    "ListEvent",
    "More",
    "Next",
    "Previous",
    "Root",
    "Scroller",
    "Segment",
    "Slot",
    "SlotLabel",
    "SlotRow",
    "SlotRows",
    "Slots",
    "TimeEvent",
    "TimeGrid",
    "Today",
    "ViewButton",
    "Week",
    "WeekNumber",
    "Weeks",
];

describe("@fragiola/calendar-vue", () => {
    it("has every React primitive and hook, by the same file name (Vue's composables)", () => {
        const names = (dir: string) =>
            sources(dir)
                .map((file) =>
                    file.slice(dir.length + 1).replace(/\.tsx?$/, ""),
                )
                .sort();
        const react = names("../react/src")
            .map((file) => file.replace(/^hooks\//, "composables/"))
            .sort();
        const own = names("src").filter(
            // Vue's own helpers: the primitive definition, the render (as Tree's)
            (file) =>
                !["utils/primitive", "utils/render", "typed"].includes(file),
        );
        const reactOnly = [
            "utils/merge-props",
            "utils/use-render",
            "utils/calendar-store",
        ];
        expect(own).toEqual(react.filter((file) => !reactOnly.includes(file)));
    });

    it("re-exports the whole core", () => {
        expect(read("src/index.ts")).toMatch(
            /^export \* from "@fragiola\/calendar";$/m,
        );
        const exported = new Map(Object.entries(vue));
        const runtime = Object.entries(core);
        expect(runtime.length).toBeGreaterThan(0);
        for (const [name, value] of runtime) {
            expect(exported.get(name), name).toBe(value);
        }
    });

    it("exports exactly the documented runtime API besides the core", () => {
        const own = Object.keys(vue).filter((name) => !(name in core));
        expect(own.sort()).toEqual([...OWN].sort());
        expect(Object.keys(vue.Calendar).sort()).toEqual(PRIMITIVES);
    });

    it("declares no name of its own that the core exports", () => {
        // a local export silently wins over `export *`: it would hide the core's
        const coreNames = new Set([
            ...exportedNames(read("../core/src/index.ts")),
            ...Object.keys(core),
        ]);
        const own = exportedNames(read("src/index.ts"));
        expect(own).toContain("Calendar");
        expect(own.filter((name) => coreNames.has(name))).toEqual([]);
    });

    it("ships each feature from its own entry: the core's, and what renders it", () => {
        const keys = (entry: object) => Object.keys(entry).sort();
        expect(keys(selectionEntry)).toEqual([
            "Selection",
            "selection",
            "useSelection",
        ]);
        expect(keys(dragAndDropEntry)).toEqual([
            "DragPreview",
            "dragAndDrop",
            "useDragPreview",
        ]);
        expect(keys(resizeEntry)).toEqual([
            "DragPreview",
            "ResizeHandle",
            "resize",
            "useDragPreview",
        ]);
        expect(keys(externalDropEntry)).toEqual(["externalDrop"]);
        expect(keys(nowIndicatorEntry)).toEqual([
            "NowIndicator",
            "nowIndicator",
            "useNowPosition",
        ]);
        expect(keys(constraintsEntry)).toEqual([
            "BusinessHours",
            "constraints",
            "useBusinessHours",
        ]);
        expect(keys(recurrenceEntry)).toEqual([
            "formatRecurrenceRule",
            "parseRecurrenceRule",
            "recurrence",
        ]);
        expect(keys(eventSourcesEntry)).toEqual(["eventSources"]);
        for (const name of [
            "Selection",
            "DragPreview",
            "ResizeHandle",
            "NowIndicator",
            "BusinessHours",
            "selection",
        ]) {
            expect(name in vue, name).toBe(false);
        }
    });

    it("never imports a feature's entry from the main entry's modules", () => {
        const features = [
            "selection",
            "drag-and-drop",
            "resize",
            "external-drop",
            "now-indicator",
            "constraints",
            "recurrence",
            "event-sources",
        ];
        const main = sources("src").filter(
            (file) => !features.some((name) => file.startsWith(`src/${name}/`)),
        );
        for (const file of main) {
            const source = read(file);
            for (const name of features) {
                expect(source, file).not.toContain(
                    `@fragiola/calendar/${name}`,
                );
                expect(source, file).not.toContain(`../${name}/`);
            }
        }
    });

    it("re-implements no calendar rule: no date, time or layout math of its own", () => {
        // the adapter reads layouts, attributes and formatting as core keys; it never computes a
        // date, a time zone, an overlap or a lane itself
        const forbidden = [
            /\bnew Date\b|\bDate\.(now|parse|UTC)\b/,
            /\bnew Intl\b|\bIntl\.\w+\(/,
            /\b(getTime|getDate|getDay|getHours|setDate|toISOString)\(/,
            /\b(addDays|addMinutes|addMonths|daysBetween|minutesBetween|parsePlainDate|parseDateTime|parsePlainTime|formatPlainDate|formatDateTime|wallClockToInstant|instantToWallClock|startOfDay|timeZoneOffset|toEpochDay|isWeekend|weekOfYear)\b/,
            /60_?000|86_?400|1440\b/,
        ];
        for (const file of sources("src")) {
            const source = codeOnly(read(file));
            for (const pattern of forbidden) {
                expect(source, `${file}: ${pattern}`).not.toMatch(pattern);
            }
        }
    });

    it("writes no `any` in its sources", () => {
        for (const file of sources("src")) {
            expect(codeOnly(read(file)), file).not.toMatch(
                /:\s*any\b|<any>|as any\b/,
            );
        }
    });

    it("ships no CSS, no icons and no text", () => {
        const manifest = JSON.parse(read("package.json")) as {
            dependencies: Record<string, string>;
            files: string[];
        };
        expect(Object.keys(manifest.dependencies)).toEqual([
            "@fragiola/calendar",
        ]);
        expect(manifest.files).toEqual([
            "dist",
            "README.md",
            "CHANGELOG.md",
            "LICENSE",
        ]);
        expect(sources("src").filter((file) => !/\.ts$/.test(file))).toEqual(
            [],
        );
        for (const file of sources("src")) {
            expect(read(file), file).not.toMatch(/aria-label|class:|"class"/);
        }
    });
});
