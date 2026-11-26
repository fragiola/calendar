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

// The Vue side of the example contract (examples/react/tests/examples.test.ts is the React one):
// every example of examples/react exists here with the same id, is single-file components
// (`index.vue` its entry) and `styles.ts`, imports only what a consumer can copy, assembles the
// calendar itself, and keeps its classes in styles.ts, the React example's own (so both
// frameworks look the same). The kit is the React kit, importing the Vue package.

const APP = examplesApp("vue");
const REACT = examplesApp("react");
const EXAMPLES_DIR = APP.examplesDir;

/** What an example file may import, besides relative files inside examples/. */
const ALLOWED = [
    /^vue$/,
    // the adapter and its feature entries (`@fragiola/calendar-vue/selection`)
    /^@fragiola\/calendar-vue(?:\/[a-z-]+)?$/,
    /^@lucide\/vue$/,
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

/** A React source as this app writes it: the Vue package for the React one. */
const forVue = (source: string) =>
    source.replaceAll("@fragiola/calendar-react", "@fragiola/calendar-vue");

/**
 * A React example's styles.ts as the Vue one must read: the Vue package's types, and the header
 * saying the SFCs read it (React's says `index.tsx`).
 */
const vueStyles = (source: string) =>
    forVue(source).replace("read by index.tsx", "read by the SFCs");

/** Where a `.vue` file styles itself instead of reading `styles.ts`. */
function inlineClasses(source: string): string[] {
    const template = source.slice(source.indexOf("<template>"));
    const found: string[] = [];
    for (const match of template.matchAll(/\sclass="[^"]*"/g)) {
        found.push(match[0].trim());
    }
    // a bound class holding a string literal (`:class="on ? 'a' : styles.b"`)
    for (const match of template.matchAll(/:class="([^"]*)"/g)) {
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

describe("the Vue examples", () => {
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

    it.each(slugs)(
        "%s shows in the code panel the files it is compiled from, index.vue first",
        (slug) => {
            const { files } = collectFiles(APP, slug);
            expect(files[0]).toBe(`${slug}/index.vue`);
            const example = examples.find((entry) => entry.slug === slug);
            expect(example?.files).toEqual(files);
        },
    );

    it.each(slugs)("%s renders <Calendar.Root> in index.vue", (slug) => {
        expect(read(join(EXAMPLES_DIR, slug, "index.vue"))).toMatch(
            /<Calendar\.Root\b/,
        );
    });

    it.each(slugs)(
        "%s keeps its classes in styles.ts, the React example's",
        (slug) => {
            const styles = join(EXAMPLES_DIR, slug, "styles.ts");
            expect(read(styles)).toBe(
                vueStyles(read(join(REACT.examplesDir, slug, "styles.ts"))),
            );
            for (const file of walk(join(EXAMPLES_DIR, slug))) {
                if (!file.endsWith(".vue")) continue;
                expect(
                    inlineClasses(read(file)),
                    relative(EXAMPLES_DIR, file),
                ).toEqual([]);
            }
        },
    );

    it("finds inline classes the styles.ts rule forbids", () => {
        const sfc = (template: string) =>
            `<script setup lang="ts"></script>\n<template>${template}</template>`;
        expect(inlineClasses(sfc('<div class="flex" />'))).toHaveLength(1);
        expect(
            inlineClasses(sfc(`<div :class="on ? 'a' : styles.b" />`)),
        ).toHaveLength(1);
        expect(
            inlineClasses(`const a = cn("x");\n${sfc("<div />")}`),
        ).toHaveLength(1);
        expect(
            inlineClasses(
                sfc(
                    '<div :class="styles.tab" /><p :class="styles.dot(state)" />',
                ),
            ),
        ).toEqual([]);
    });

    it("use the app's API only: never engine.adapter (an adapter's side)", () => {
        for (const file of walk(EXAMPLES_DIR)) {
            if (!/\.(ts|vue)$/.test(file)) continue;
            expect(read(file), relative(EXAMPLES_DIR, file)).not.toMatch(
                /\.adapter\b/,
            );
        }
    });

    it("copy React's framework-free sibling modules (the Vue package for the React one)", () => {
        for (const slug of slugs) {
            for (const file of walk(join(REACT.examplesDir, slug))) {
                const name = relative(REACT.examplesDir, file);
                if (!name.endsWith(".ts") || name.endsWith("styles.ts")) {
                    continue;
                }
                const source = read(file);
                // a module of React code (a hook) has its Vue counterpart, not a copy
                if (/from "react"/.test(source)) continue;
                expect(read(join(EXAMPLES_DIR, name)), name).toBe(
                    forVue(source),
                );
            }
        }
    });
});

describe("the app", () => {
    // a Vue app installs one package: the Vue package brings the core and re-exports it
    const APP_ROOT = join(import.meta.dirname, "..");

    it("depends on @fragiola/calendar-vue only, and never imports @fragiola/calendar", () => {
        const manifest = read(join(APP_ROOT, "package.json"));
        expect(manifest).toContain('"@fragiola/calendar-vue"');
        expect(manifest).not.toContain('"@fragiola/calendar"');
        const files = ["src", "tests"]
            .flatMap((dir) => walk(join(APP_ROOT, dir)))
            .filter((file) => /\.(ts|vue)$/.test(file));
        expect(files.length).toBeGreaterThan(0);
        for (const file of files) {
            expect(
                importsOf(read(file)),
                relative(APP_ROOT, file),
            ).not.toContain("@fragiola/calendar");
        }
    });
});

describe("the kit", () => {
    it("is the React kit, importing the Vue package", () => {
        expect(readdirSync(join(EXAMPLES_DIR, "_kit")).sort()).toEqual(
            [...KIT_FILES].sort(),
        );
        for (const file of KIT_FILES) {
            expect(read(join(EXAMPLES_DIR, "_kit", file)), file).toBe(
                forVue(read(join(REACT.examplesDir, "_kit", file))),
            );
        }
    });
});
