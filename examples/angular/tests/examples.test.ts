import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
    collectFiles,
    type ExampleEntry,
    examplesApp,
    importsOf,
    listExampleSlugs,
    loadExamples,
} from "examples-shared/scripts/examples-lib";
import { beforeAll, describe, expect, it } from "vitest";

// The Angular side of the example contract (examples/react/tests/examples.test.ts is the React
// one): every example of examples/react exists here with the same id, is standalone components
// with inline templates (`index.ts` its entry, default-exporting the example's component) and
// `styles.ts`, imports only what a consumer can copy, assembles the calendar itself, and keeps
// its classes in styles.ts, Vue's own copy of the React example's (so every framework looks the
// same). The kit is the React kit, importing the Angular package.

const APP = examplesApp("angular");
const VUE = examplesApp("vue");
const REACT = examplesApp("react");
const EXAMPLES_DIR = APP.examplesDir;

/** What an example file may import, besides relative files inside examples/. */
const ALLOWED = [
    /^@angular\/(core|common)$/,
    // the adapter and its feature entries (`@fragiola/calendar-angular/selection`)
    /^@fragiola\/calendar-angular(?:\/[a-z-]+)?$/,
    /^@lucide\/angular$/,
    /^#\/components\/(ui|atoms)\/[a-z-]+$/,
    /^#\/lib\/cn$/,
];

/** Site files under examples/ that are not example code. */
const SITE_FILES = [/\.generated\.ts$/, /\.md$/, /\.css$/];

/** The kit: React's, file for file. */
const KIT_FILES = [
    "data.ts",
    "fake-server.ts",
    "format.ts",
    "persist.ts",
    "undo.ts",
];

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });
}

const read = (file: string) => readFileSync(file, "utf-8");

/** A React source as this app writes it: the Angular package for the React one. */
const forAngular = (source: string) =>
    source.replaceAll("@fragiola/calendar-react", "@fragiola/calendar-angular");

/**
 * A Vue example's styles.ts as the Angular one must read: the Angular package's types, and the
 * header saying the components read it (Vue's says the SFCs).
 */
const angularStyles = (source: string) =>
    source
        .replaceAll("@fragiola/calendar-vue", "@fragiola/calendar-angular")
        .replace("read by the SFCs", "read by the components");

/**
 * Where a component styles itself instead of reading `styles.ts`: a static `class="…"` or a
 * bound class holding a string literal (`[class]="on ? 'a' : styles.b"`) in its template, or
 * `cn(` in its code. A component's own `host: { class: "contents" }` (no box of its own) is not a
 * look.
 */
function inlineClasses(source: string): string[] {
    const found: string[] = [];
    for (const match of source.matchAll(/\sclass="[^"]*"/g)) {
        found.push(match[0].trim());
    }
    for (const match of source.matchAll(/\[class\]="([^"]*)"/g)) {
        if (/['`]/.test(match[1] ?? "")) found.push(match[0]);
    }
    for (const match of source.matchAll(/\bcn\(/g)) {
        found.push(source.slice(match.index, match.index + 40));
    }
    return found;
}

let examples: ExampleEntry[] = [];

beforeAll(async () => {
    examples = await loadExamples(APP);
});

describe("the Angular examples", () => {
    const slugs = listExampleSlugs(APP);

    it("are every example of examples/react, with the same ids, all in the manifest", () => {
        expect(slugs).toEqual(listExampleSlugs(REACT));
        expect(examples.map((example) => example.slug).sort()).toEqual(slugs);
    });

    it("import only what a consumer can copy", () => {
        const files = walk(EXAMPLES_DIR)
            .map((file) => relative(EXAMPLES_DIR, file))
            .filter(
                (file) => !SITE_FILES.some((pattern) => pattern.test(file)),
            );
        expect(files.length).toBeGreaterThan(0);
        for (const file of files) {
            for (const specifier of importsOf(read(join(EXAMPLES_DIR, file)))) {
                if (specifier.startsWith(".")) continue;
                expect(
                    ALLOWED.some((pattern) => pattern.test(specifier)),
                    `${file} imports "${specifier}"`,
                ).toBe(true);
            }
        }
    });

    it("finds an import that is not copyable", () => {
        const copyable = (specifier: string) =>
            ALLOWED.some((pattern) => pattern.test(specifier));
        expect(copyable("@fragiola/calendar-angular/drag-and-drop")).toBe(true);
        expect(copyable("#/components/ui/dialog")).toBe(true);
        expect(copyable("@fragiola/calendar")).toBe(false);
        expect(copyable("@fragiola/calendar-angular/internal/utils")).toBe(
            false,
        );
        expect(copyable("@angular/platform-browser")).toBe(false);
        expect(copyable("#/embed/main")).toBe(false);
    });

    it.each(slugs)(
        "%s shows in the code panel the files it is compiled from, index.ts first",
        (slug) => {
            const { files } = collectFiles(APP, slug);
            expect(files[0]).toBe(`${slug}/index.ts`);
            const example = examples.find((entry) => entry.slug === slug);
            expect(example?.files).toEqual(files);
        },
    );

    it.each(slugs)(
        "%s default-exports its component, which renders [calendarRoot] in index.ts",
        (slug) => {
            const source = read(join(EXAMPLES_DIR, slug, "index.ts"));
            expect(source).toMatch(/^export default class \w+/m);
            expect(source).toMatch(/\[calendarRoot\]="/);
        },
    );

    it.each(slugs)("%s keeps its classes in styles.ts, Vue's", (slug) => {
        const styles = join(EXAMPLES_DIR, slug, "styles.ts");
        expect(read(styles)).toBe(
            angularStyles(read(join(VUE.examplesDir, slug, "styles.ts"))),
        );
        for (const file of walk(join(EXAMPLES_DIR, slug))) {
            if (file.endsWith("styles.ts")) continue;
            expect(
                inlineClasses(read(file)),
                relative(EXAMPLES_DIR, file),
            ).toEqual([]);
        }
    });

    it("finds inline classes the styles.ts rule forbids", () => {
        expect(inlineClasses('<div class="flex"></div>')).toHaveLength(1);
        expect(
            inlineClasses(`<div [class]="on ? 'a' : styles.b"></div>`),
        ).toHaveLength(1);
        expect(inlineClasses('const a = cn("x");')).toHaveLength(1);
        expect(
            inlineClasses(
                '<div [class]="styles.tab"></div><p [class]="event.state() && styles.dot(event.state()!)"></p>',
            ),
        ).toEqual([]);
        expect(inlineClasses('host: { class: "contents" },')).toEqual([]);
    });

    it("use the app's API only: never engine.adapter (an adapter's side)", () => {
        for (const file of walk(EXAMPLES_DIR)) {
            if (!file.endsWith(".ts")) continue;
            expect(read(file), relative(EXAMPLES_DIR, file)).not.toMatch(
                /\.adapter\b/,
            );
        }
    });

    it("copy React's framework-free sibling modules (the Angular package for the React one)", () => {
        for (const slug of slugs) {
            for (const file of walk(join(REACT.examplesDir, slug))) {
                const name = relative(REACT.examplesDir, file);
                if (!name.endsWith(".ts") || name.endsWith("styles.ts")) {
                    continue;
                }
                const source = read(file);
                // a module of React code (a hook) has its Angular counterpart, not a copy
                if (/from "react"/.test(source)) continue;
                expect(read(join(EXAMPLES_DIR, name)), name).toBe(
                    forAngular(source),
                );
            }
        }
    });

    it("tell the root when a month renders week numbers (`weekNumberColumn`)", () => {
        for (const slug of slugs) {
            for (const file of walk(join(EXAMPLES_DIR, slug))) {
                const source = read(file);
                if (!source.includes("calendarWeekNumber")) continue;
                expect(
                    read(join(EXAMPLES_DIR, slug, "index.ts")),
                    slug,
                ).toMatch(/\[calendarRoot\]="[^"]*"[^>]*\bweekNumberColumn\b/);
            }
        }
    });
});

describe("the app", () => {
    // an Angular app installs one package: the Angular package brings the core and re-exports it
    const APP_ROOT = join(import.meta.dirname, "..");

    it("depends on @fragiola/calendar-angular only, and never imports @fragiola/calendar", () => {
        const manifest = read(join(APP_ROOT, "package.json"));
        expect(manifest).toContain('"@fragiola/calendar-angular"');
        expect(manifest).not.toContain('"@fragiola/calendar"');
        const files = ["src", "tests"]
            .flatMap((dir) => walk(join(APP_ROOT, dir)))
            .filter((file) => file.endsWith(".ts"));
        expect(files.length).toBeGreaterThan(0);
        for (const file of files) {
            expect(
                importsOf(read(file)),
                relative(APP_ROOT, file),
            ).not.toContain("@fragiola/calendar");
        }
    });

    it("runs zoneless: no zone.js anywhere, the embed bootstrapped without it", () => {
        expect(read(join(APP_ROOT, "package.json"))).not.toContain("zone.js");
        expect(read(join(APP_ROOT, "src/embed/main.ts"))).toContain(
            "provideZonelessChangeDetection()",
        );
    });
});

describe("the kit", () => {
    it("is the React kit, importing the Angular package", () => {
        expect(readdirSync(join(EXAMPLES_DIR, "_kit")).sort()).toEqual(
            [...KIT_FILES].sort(),
        );
        for (const file of KIT_FILES) {
            expect(read(join(EXAMPLES_DIR, "_kit", file)), file).toBe(
                forAngular(read(join(REACT.examplesDir, "_kit", file))),
            );
        }
    });
});
