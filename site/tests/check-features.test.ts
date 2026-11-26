import { describe, expect, it } from "vitest";
import {
    FEATURES,
    type FeatureMarkers,
    featureLeaks,
    mainEntryOf,
    markersOf,
} from "../../scripts/check-features.ts";

// `pnpm build` runs scripts/check-features.ts over every package's built main entry: it fails when
// one ships a feature's code. No feature exists yet (AGENTS.md D2): these pin the check itself on
// planted builds, with a planted feature.

/** A planted feature, as its built factory would name its keys. */
const SELECTION: FeatureMarkers = {
    subpath: "selection",
    markers: markersOf({
        commands: { "selection.set": {}, "selection.clear": {} },
        queries: { "selected-range": {} },
        questions: { "date-selected": {} },
    }),
};

/** A build of named files, as the guard reads a `dist`. */
const built = (files: Record<string, string>) => (name: string) => files[name];

describe("the features' bundle guard", () => {
    it("has no feature to guard yet", () => {
        expect(FEATURES).toEqual([]);
    });

    it("reads a feature's markers: its command, get and is keys", () => {
        expect(SELECTION.markers).toEqual([
            "selection.set",
            "selection.clear",
            "selected-range",
            "date-selected",
        ]);
        expect(markersOf({})).toEqual([]);
    });

    it("passes a main entry, and its chunks, holding no feature's marker", () => {
        const read = built({
            "index.js": 'import { a } from "./shared-1.js";\nexport { a };',
            "shared-1.js": 'export const a = "event.move";',
        });
        expect(featureLeaks("index.js", read, [SELECTION])).toEqual([]);
    });

    it("fails a planted import: a chunk of the main entry holding a feature's marker", () => {
        const read = built({
            "index.js": 'import { s } from "./shared-1.js";\nexport { s };',
            "shared-1.js": "export const s = { 'selection.set': 1 };",
        });
        expect(featureLeaks("index.js", read, [SELECTION])).toEqual([
            `shared-1.js: selection's "selection.set"`,
        ]);
    });

    it("fails a main entry that imports a feature's entry point", () => {
        const read = built({
            "index.js":
                'export { selection } from "@fragiola/calendar/selection";',
        });
        expect(featureLeaks("index.js", read, [SELECTION])).toEqual([
            "index.js: imports the selection entry",
        ]);
    });

    it("ignores a feature's own entry, which the main entry does not import", () => {
        const read = built({
            "index.js": "export const core = 1;",
            "selection.js": 'export const keys = ["selection.set"];',
        });
        expect(featureLeaks("index.js", read, [SELECTION])).toEqual([]);
    });

    it("finds no main entry where nothing was built", () => {
        expect(mainEntryOf("/nowhere", "@fragiola/calendar")).toBeUndefined();
    });
});
