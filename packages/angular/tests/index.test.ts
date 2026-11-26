// The package's surface (packages/react's and packages/vue's, for Angular): every React primitive
// and hook by the same file name (a directive per part, `.directive.ts`, an injection function per
// hook), with the same part attribute; the whole core re-exported, the documented runtime API
// besides it, no shadowed core name, each feature from its own entry point, the code the entries
// share in `internal`, no `any`, no CSS or text shipped, and no calendar rule re-implemented.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import * as core from "@fragiola/calendar";
import { describe, expect, it } from "vitest";
import { codeOnly } from "../../../scripts/check-dts.ts";
import { exportedNames } from "../../../scripts/exported-names.ts";
import * as constraintsEntry from "../constraints/public-api";
import * as dragAndDropEntry from "../drag-and-drop/public-api";
import * as eventSourcesEntry from "../event-sources/public-api";
import * as externalDropEntry from "../external-drop/public-api";
import * as nowIndicatorEntry from "../now-indicator/public-api";
import * as recurrenceEntry from "../recurrence/public-api";
import * as resizeEntry from "../resize/public-api";
import * as selectionEntry from "../selection/public-api";
import * as angular from "../src/public-api";

const root = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf-8");

function sources(dir: string): string[] {
    return readdirSync(join(root, dir)).flatMap((name) => {
        const path = `${dir}/${name}`;
        return statSync(join(root, path)).isDirectory()
            ? sources(path)
            : [path];
    });
}

const FEATURES = [
    "selection",
    "drag-and-drop",
    "resize",
    "external-drop",
    "now-indicator",
    "constraints",
    "recurrence",
    "event-sources",
];

/** Every source of the package: the main entry, `internal` and the features' entries. */
const SOURCES = ["src", "internal", ...FEATURES].flatMap(sources);

/** The React file a source of this package stands for (`undefined`: Angular's own). */
function reactFileOf(file: string): string | undefined {
    const directive =
        /^(?:src\/lib\/directives|([\w-]+)\/directives)\/([\w-]+)\.directive\.ts$/.exec(
            file,
        );
    if (directive) {
        const [, feature, name] = directive;
        return feature ? `${feature}/${name}.tsx` : `components/${name}.tsx`;
    }
    const injection =
        /^(?:src\/lib\/inject|([\w-]+)\/inject)\/([\w-]+)\.ts$/.exec(file);
    if (injection) {
        const [, feature, name = ""] = injection;
        const hook = name.replace(/^inject-/, "use-");
        return feature ? `${feature}/${hook}.ts` : `hooks/${hook}.ts`;
    }
    return undefined;
}

/** The root's feature directives (React's feature callbacks on `Root`): Angular's own. */
const ROOT_FEATURE_DIRECTIVES = [
    "selection/directives/selection-root.directive.ts",
    "drag-and-drop/directives/drag-and-drop-root.directive.ts",
    "external-drop/directives/external-drop-root.directive.ts",
];

/** The package's own runtime exports: the documented API. */
const OWN = [
    "CALENDAR",
    "createCalendarRef",
    "injectCalendar",
    "injectCalendarRef",
    "injectCalendarTitle",
    "injectCalendarView",
    "injectDay",
    "injectDayGrid",
    "injectDayHeader",
    "injectListEvent",
    "injectListLayout",
    "injectSegment",
    "injectSlot",
    "injectSlotLabel",
    "injectTimeEvent",
    "injectTimeGrid",
];

describe("@fragiola/calendar-angular", () => {
    it("has a directive for every React primitive and an injection function for every hook, by the same file name", () => {
        const react = sources("../react/src")
            .map((file) => file.slice("../react/src/".length))
            .filter(
                (file) =>
                    (/^components\/|^hooks\/use-/.test(file) ||
                        FEATURES.some(
                            (feature) =>
                                file.startsWith(`${feature}/`) &&
                                file !== `${feature}/index.ts`,
                        )) &&
                    file !== "hooks/use-calendar-ref.ts",
            )
            .sort();
        const mapped = SOURCES.filter(
            (file) => !ROOT_FEATURE_DIRECTIVES.includes(file),
        )
            .map(reactFileOf)
            .filter(
                (file): file is string =>
                    file !== undefined &&
                    file !== "hooks/use-calendar-ref.ts" &&
                    file !== "hooks/create-calendar-ref.ts",
            )
            .sort();
        expect(mapped).toEqual(react);
        // React's resize entry re-exports drag and drop's preview: so does Angular's
        expect(read("resize/public-api.ts")).toContain(
            '"@fragiola/calendar-angular/drag-and-drop"',
        );
    });

    it("gives each directive the part attribute of its React primitive", () => {
        const partsOf = (source: string, call: RegExp) =>
            [...source.matchAll(call)].map(([, name]) => name).sort();
        for (const file of SOURCES.filter((one) =>
            one.endsWith(".directive.ts"),
        )) {
            const reactFile = reactFileOf(file);
            if (!reactFile || ROOT_FEATURE_DIRECTIVES.includes(file)) continue;
            const reactSource = read(`../react/src/${reactFile}`);
            const own = partsOf(
                read(file),
                /(?:bindPart\([^"]*|bindCommandButton\([^"]*)"([\w-]+)"/g,
            );
            const react = partsOf(
                reactSource,
                /(?:usePart\(\s*context,\s*|useCommandButton\(\s*context,\s*)"([\w-]+)"/g,
            );
            // a part hook's file (`useDay`) holds React's part: the directive binds the part itself
            const hooks = [
                ...reactSource.matchAll(
                    /\buse(Day|Slot|Segment|TimeEvent|ListEvent)\(/g,
                ),
            ].map(([, hook]) =>
                hook === "Day" ? "day" : hook === "Slot" ? "slot" : "event",
            );
            expect(own, file).toEqual([...react, ...hooks].sort());
        }
    });

    it("re-exports the whole core", () => {
        expect(read("src/public-api.ts")).toMatch(
            /^export \* from "@fragiola\/calendar";$/m,
        );
        const exported = new Map(Object.entries(angular));
        const runtime = Object.entries(core);
        expect(runtime.length).toBeGreaterThan(0);
        for (const [name, value] of runtime) {
            expect(exported.get(name), name).toBe(value);
        }
    });

    it("exports exactly the documented runtime API besides the core: the directives, CALENDAR and the injection functions", () => {
        const own = Object.keys(angular).filter((name) => !(name in core));
        const directives = own.filter((name) => name.endsWith("Directive"));
        expect(
            own.filter((name) => !name.endsWith("Directive")).sort(),
        ).toEqual([...OWN].sort());
        expect([...angular.CALENDAR].map((one) => one.name).sort()).toEqual(
            directives.sort(),
        );
        for (const name of directives) {
            expect(name, name).toMatch(/^Calendar\w+Directive$/);
        }
    });

    it("declares no name of its own that the core exports", () => {
        const coreNames = new Set([
            ...exportedNames(read("../core/src/index.ts")),
            ...Object.keys(core),
        ]);
        const own = exportedNames(read("src/public-api.ts"));
        expect(own).toContain("CALENDAR");
        expect(own.filter((name) => coreNames.has(name))).toEqual([]);
    });

    it("ships each feature from its own entry point: the core's, and what renders it", () => {
        const keys = (entry: object) => Object.keys(entry).sort();
        expect(keys(selectionEntry)).toEqual([
            "CalendarSelectionDirective",
            "CalendarSelectionRootDirective",
            "injectSelection",
            "selection",
        ]);
        expect(keys(dragAndDropEntry)).toEqual([
            "CalendarDragAndDropRootDirective",
            "CalendarDragPreviewDirective",
            "dragAndDrop",
            "injectDragPreview",
        ]);
        expect(keys(resizeEntry)).toEqual([
            "CalendarDragAndDropRootDirective",
            "CalendarDragPreviewDirective",
            "CalendarResizeHandleDirective",
            "injectDragPreview",
            "resize",
        ]);
        expect(resizeEntry.CalendarDragPreviewDirective).toBe(
            dragAndDropEntry.CalendarDragPreviewDirective,
        );
        expect(keys(externalDropEntry)).toEqual([
            "CalendarExternalDropRootDirective",
            "externalDrop",
        ]);
        expect(keys(nowIndicatorEntry)).toEqual([
            "CalendarNowIndicatorDirective",
            "injectNowPosition",
            "nowIndicator",
        ]);
        expect(keys(constraintsEntry)).toEqual([
            "CalendarBusinessHoursDirective",
            "constraints",
            "injectBusinessHours",
        ]);
        expect(keys(recurrenceEntry)).toEqual([
            "formatRecurrenceRule",
            "parseRecurrenceRule",
            "recurrence",
        ]);
        expect(keys(eventSourcesEntry)).toEqual(["eventSources"]);
        for (const name of [
            "CalendarSelectionDirective",
            "CalendarDragPreviewDirective",
            "selection",
        ]) {
            expect(name in angular, name).toBe(false);
        }
    });

    it("never imports a feature from the main entry or internal, and a feature imports no other folder", () => {
        const shared = [...sources("src"), ...sources("internal")];
        for (const file of shared) {
            const source = read(file);
            for (const name of FEATURES) {
                expect(source, file).not.toMatch(
                    new RegExp(`from "@fragiola/calendar(-angular)?/${name}"`),
                );
            }
        }
        // ng-packagr builds each entry point from its own folder (TS6059): an entry reaches another
        // through its public API only
        for (const file of SOURCES) {
            const depth = file.split("/").length - 1;
            for (const [, specifier = ""] of read(file).matchAll(
                /from "(\.[^"]*)"/g,
            )) {
                const ups = specifier
                    .split("/")
                    .filter((part) => part === "..").length;
                expect(ups < depth, `${file}: ${specifier}`).toBe(true);
            }
        }
        expect(read("src/lib/directives/root.directive.ts")).not.toMatch(
            /from "\.\.\/\.\.\/\.\.\//,
        );
    });

    it("re-implements no calendar rule: no date, time or layout math of its own", () => {
        const forbidden = [
            /\bnew Date\b|\bDate\.(now|parse|UTC)\b/,
            /\bnew Intl\b|\bIntl\.\w+\(/,
            /\b(getTime|getDate|getDay|getHours|setDate|toISOString)\(/,
            /\b(addDays|addMinutes|addMonths|daysBetween|minutesBetween|parsePlainDate|parseDateTime|parsePlainTime|formatPlainDate|formatDateTime|wallClockToInstant|instantToWallClock|startOfDay|timeZoneOffset|toEpochDay|isWeekend|weekOfYear)\b/,
            /60_?000|86_?400|1440\b/,
        ];
        for (const file of SOURCES) {
            const source = codeOnly(read(file));
            for (const pattern of forbidden) {
                expect(source, `${file}: ${pattern}`).not.toMatch(pattern);
            }
        }
    });

    it("writes no `any` in its sources", () => {
        for (const file of SOURCES) {
            expect(codeOnly(read(file)), file).not.toMatch(
                /:\s*any\b|<any>|as any\b/,
            );
        }
    });

    it("ships no CSS, no icons and no text", () => {
        const manifest = JSON.parse(read("package.json")) as {
            dependencies: Record<string, string>;
            peerDependencies: Record<string, string>;
            files: string[];
        };
        expect(Object.keys(manifest.dependencies)).toEqual([
            "@fragiola/calendar",
        ]);
        expect(Object.keys(manifest.peerDependencies)).toEqual([
            "@angular/core",
        ]);
        expect(manifest.files).toEqual([
            "dist",
            "README.md",
            "CHANGELOG.md",
            "LICENSE",
        ]);
        expect(SOURCES.filter((file) => !/\.(ts|json)$/.test(file))).toEqual(
            [],
        );
        for (const file of SOURCES) {
            // no style of its own; the one component (a view's empty root) has no template
            expect(read(file), file).not.toMatch(
                /aria-label|"class"|styleUrls|styles:|^\s*template: (?!"")/m,
            );
        }
    });
});
