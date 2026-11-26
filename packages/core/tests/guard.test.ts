// The core's non-negotiable rules (AGENTS.md, D21), each one a test: no framework import, zero
// runtime dependencies, no global DOM, crypto or timers, no `Date` (D4: strict parsers only),
// nothing only Node has, no `any` in the exported declarations, no CSS class names, no `.style`
// outside `src/engine/structural-style.ts`, and no ported code (nothing is copied from
// FullCalendar, Schedule-X or SVAR: Provenance). Shaped like Flow's (fragiola/flow,
// packages/core/tests/guard.test.ts), same author and licence.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
const src = join(root, "src");

function listFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? listFiles(path) : [path];
    });
}

/** Source text with comments and string literals blanked out, so only code is scanned. */
function codeOnly(source: string): string {
    return source.replace(
        /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g,
        (match) => (match.startsWith("/") ? "" : '""'),
    );
}

/** The files of src/ whose code matches `pattern`, with what matched. */
function offendersOf(pattern: RegExp, scan = codeOnly): string[] {
    return listFiles(src).flatMap((file) => {
        const match = pattern.exec(scan(readFileSync(file, "utf8")));
        return match ? [`${file.slice(root.length + 1)}: ${match[0]}`] : [];
    });
}

const keep = (source: string) => source;

/** The one file that may write a style: `touch-action` on draggable events (D18). */
const STRUCTURAL_STYLE = "src/engine/structural-style.ts";

/** The style properties `structural-style.ts` may write. */
const STRUCTURAL_PROPERTIES: ReadonlySet<string> = new Set([
    "touchAction",
    "setProperty",
    "removeProperty",
]);

// the core never reaches for the browser globals: DOM access goes through an element's
// ownerDocument/defaultView or the engine's injected host, so it runs inside an iframe or a popup
// window, and the model loads in Node
const GLOBAL_DOM =
    /(?<![.\w$])(document|window|requestAnimationFrame|cancelAnimationFrame|ResizeObserver|MutationObserver|IntersectionObserver|getComputedStyle|navigator|localStorage|sessionStorage|matchMedia)\b(?!\s*\??:)/;
const GLOBAL_CRYPTO = /(?<![.\w$])crypto\b(?!\s*\??:)/;

/** Timers come from the root's `defaultView` through the injected host (D16), never the globals. */
const GLOBAL_TIMER =
    /(?<![.\w$])(setTimeout|clearTimeout|setInterval|clearInterval)\b(?!\s*\??:)/;

/**
 * `Date` objects and string parsing: dates are parsed by the time domain's strict parsers (D4), and
 * `Intl` formats epoch milliseconds directly, so the core never builds a `Date` (whose string
 * parsing and local-time getters depend on the engine and the host zone).
 */
const DATE_PARSING =
    /(?<![.\w$])(?:new\s+Date\b|Date\s*\(|Date\.parse\b)|\.(?:getTimezoneOffset|getHours|getDate|getDay|getMonth|getFullYear|getMinutes|setHours|setDate|setMonth|setFullYear)\s*\(/;

/** Node's own modules and globals: the core runs in a browser too. */
const NODE_ONLY =
    /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](?:node:[^"']+|fs|path|os|process)["']|(?<![.\w$])(?:process|Buffer|__dirname)\b(?!\s*\??:)/;

/** Any UI framework an adapter wraps, and the references' own packages. */
const IMPORT_FRAMEWORK =
    /(?:from\s+|import\s+|import\s*\(\s*|require\s*\(\s*)["'](?:react|react-dom|preact|vue|@vue\/[^"']+|@angular\/[^"']+|svelte|solid-js|@fullcalendar\/[^"']+|fullcalendar|@schedule-x\/[^"']+|@svar-ui\/[^"']+|rrule|temporal-polyfill|@js-temporal\/[^"']+)(?:\/[^"']*)?["']/;

/** Any import that is not a relative path: the core has no runtime dependency. */
const PACKAGE_IMPORT =
    /(?:from\s+|import\s+|import\s*\(\s*|require\s*\(\s*)["'](?!\.)[^"']+["']/;

/**
 * A header that says its code comes from a reference, or carries an upstream copyright: a port,
 * which this repository never has. Naming a reference as the behaviour studied is fine.
 */
const PORTED_HEADER =
    /\b(?:port(?:ed)?|adapt(?:ed)?|cop(?:y|ied)|derived|translated)\s+(?:\w+\s+)?from\s+(?:FullCalendar|Schedule-X|SVAR)|Copyright \(c\)/i;

/** A file's leading line comments, joined into one sentence. */
function headOf(file: string): string {
    return (
        /^(?:\/\/[^\n]*\n)+/.exec(readFileSync(file, "utf8"))?.[0] ?? ""
    ).replace(/\s*\n\/\/\s*|\s+/g, " ");
}

/** The exported declarations of a source (comments and strings already blanked). */
function exportedDeclarations(source: string): string[] {
    const declarations: string[] = [];
    const lines = source.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        if (!line.startsWith("export ")) {
            continue;
        }
        const block = [line];
        // a multi-line declaration runs until a line closing it at column 0
        if (!/;\s*$/.test(line) && !/^export \{.*\}.*;?$/.test(line)) {
            for (let j = i + 1; j < lines.length; j++) {
                const next = lines[j] ?? "";
                block.push(next);
                if (/^[}\]);]/.test(next)) {
                    break;
                }
            }
        }
        declarations.push(block.join("\n"));
    }
    return declarations;
}

/** What is wrong with a package manifest's dependencies: the core has none of any kind. */
function dependencyProblems(manifest: Record<string, unknown>): string[] {
    return ["dependencies", "peerDependencies", "optionalDependencies"].flatMap(
        (field) => {
            const names = Object.keys((manifest[field] ?? {}) as object);
            return names.length > 0 ? [`${field}: ${names.join(", ")}`] : [];
        },
    );
}

describe("core package guard", () => {
    it("has no runtime, peer or optional dependencies", () => {
        const manifest = JSON.parse(
            readFileSync(join(root, "package.json"), "utf8"),
        ) as Record<string, unknown>;
        expect(dependencyProblems(manifest)).toEqual([]);
    });

    it("imports nothing but its own modules", () => {
        expect(offendersOf(PACKAGE_IMPORT, keep)).toEqual([]);
    });

    it("never imports a framework, nor a reference's package", () => {
        expect(offendersOf(IMPORT_FRAMEWORK, keep)).toEqual([]);
    });

    it("never touches global document, window, observers or frame scheduling", () => {
        expect(offendersOf(GLOBAL_DOM)).toEqual([]);
    });

    it("never reaches for the global crypto (ids come from an injectable createId)", () => {
        expect(offendersOf(GLOBAL_CRYPTO)).toEqual([]);
    });

    it("never schedules through the global timers (the engine's host gives them)", () => {
        expect(offendersOf(GLOBAL_TIMER)).toEqual([]);
    });

    it("never builds a Date nor parses a string with it (D4)", () => {
        expect(offendersOf(DATE_PARSING)).toEqual([]);
    });

    it("uses nothing only Node has", () => {
        expect(offendersOf(NODE_ONLY)).toEqual([]);
    });

    it("has no `any` in its exported declarations", () => {
        const offenders = listFiles(src).flatMap((file) =>
            exportedDeclarations(codeOnly(readFileSync(file, "utf8")))
                .filter((declaration) => /\bany\b/.test(declaration))
                .map((declaration) => `${file}: ${declaration.slice(0, 80)}`),
        );
        expect(offenders).toEqual([]);
    });

    it("has no CSS class names, and writes a style only in structural-style.ts", () => {
        expect(offendersOf(/\b(className|classList|cursor)\b/)).toEqual([]);
        expect(
            offendersOf(/\.style\b/).filter(
                (offender) => !offender.startsWith(STRUCTURAL_STYLE),
            ),
        ).toEqual([]);
        const file = join(root, STRUCTURAL_STYLE);
        const writes = existsSync(file)
            ? [
                  ...codeOnly(readFileSync(file, "utf8")).matchAll(
                      /\.style\.(\w+)/g,
                  ),
              ].map(([, property]) => property ?? "")
            : [];
        expect(
            writes.filter((property) => !STRUCTURAL_PROPERTIES.has(property)),
        ).toEqual([]);
    });

    it("has no ported code: no file names an upstream origin (Provenance)", () => {
        const ported = [...listFiles(src), ...listFiles(join(root, "tests"))]
            .filter((file) => !file.endsWith("guard.test.ts"))
            .filter((file) => PORTED_HEADER.test(headOf(file)))
            .map((file) => file.slice(root.length + 1));
        expect(ported).toEqual([]);
    });

    it("ships the repository's licence, and only the maintainer's", () => {
        const licence = readFileSync(join(root, "..", "..", "LICENSE"), "utf8");
        expect(readFileSync(join(root, "LICENSE"), "utf8")).toBe(licence);
        expect([...licence.matchAll(/Copyright \(c\)/g)]).toHaveLength(1);
        expect(licence).toContain("Copyright (c) 2026 Mauro de Souza");
    });
});

// The checks above must catch what they are written for: each pattern against a planted sample.
describe("the guard's own patterns", () => {
    const hits = (pattern: RegExp, code: string) =>
        pattern.test(codeOnly(code));

    it("fails a planted framework import, not a look-alike", () => {
        for (const source of [
            'import "react";',
            'import type * as React from "react";',
            'import { createPortal } from "react-dom/client";',
            'import { h } from "preact";',
            'import { h } from "vue";',
            'import { Component } from "@angular/core";',
            'import { Calendar } from "@fullcalendar/core";',
            'import { createCalendar } from "@schedule-x/calendar";',
            'import { RRule } from "rrule";',
            'import { Temporal } from "temporal-polyfill";',
        ]) {
            expect(IMPORT_FRAMEWORK.test(source), source).toBe(true);
        }
        expect(IMPORT_FRAMEWORK.test('import { x } from "./reactive";')).toBe(
            false,
        );
    });

    it("fails a planted package import, not a relative one", () => {
        expect(PACKAGE_IMPORT.test('import "react";')).toBe(true);
        expect(PACKAGE_IMPORT.test('import { x } from "date-fns";')).toBe(true);
        expect(PACKAGE_IMPORT.test('export * from "luxon";')).toBe(true);
        expect(PACKAGE_IMPORT.test('import { x } from "../time/x";')).toBe(
            false,
        );
    });

    it("fails a planted runtime, peer or optional dependency", () => {
        expect(
            dependencyProblems({ dependencies: { luxon: "3.0.0" } }),
        ).toEqual(["dependencies: luxon"]);
        expect(
            dependencyProblems({ peerDependencies: { react: "^19" } }),
        ).toEqual(["peerDependencies: react"]);
        expect(
            dependencyProblems({ optionalDependencies: { rrule: "2.8.1" } }),
        ).toEqual(["optionalDependencies: rrule"]);
        expect(
            dependencyProblems({ devDependencies: { vitest: "5.1.0" } }),
        ).toEqual([]);
    });

    it("fails a planted global document, window or requestAnimationFrame, not through an owner", () => {
        expect(hits(GLOBAL_DOM, "document.createElement('div');")).toBe(true);
        expect(hits(GLOBAL_DOM, "window.addEventListener('x', f);")).toBe(true);
        expect(hits(GLOBAL_DOM, "requestAnimationFrame(() => {});")).toBe(true);
        expect(hits(GLOBAL_DOM, "new ResizeObserver(cb);")).toBe(true);
        expect(
            hits(
                GLOBAL_DOM,
                "el.ownerDocument.defaultView.requestAnimationFrame(cb);",
            ),
        ).toBe(false);
        expect(hits(GLOBAL_DOM, '// the window\nconst s = "document";')).toBe(
            false,
        );
        expect(hits(GLOBAL_DOM, "function f(window: Window) {}")).toBe(false);
    });

    it("fails a planted global crypto, not a view's", () => {
        expect(hits(GLOBAL_CRYPTO, "crypto.randomUUID()")).toBe(true);
        expect(hits(GLOBAL_CRYPTO, "view.crypto.randomUUID()")).toBe(false);
    });

    it("fails a planted global setTimeout, not the host's", () => {
        expect(hits(GLOBAL_TIMER, "setTimeout(refresh, 1000);")).toBe(true);
        expect(
            hits(GLOBAL_TIMER, "const id = setInterval(tick, 60_000);"),
        ).toBe(true);
        expect(hits(GLOBAL_TIMER, "clearTimeout(id);")).toBe(true);
        expect(hits(GLOBAL_TIMER, "host.setTimeout(refresh, 1000);")).toBe(
            false,
        );
        expect(
            hits(
                GLOBAL_TIMER,
                "el.ownerDocument.defaultView.setTimeout(f, 0);",
            ),
        ).toBe(false);
        expect(hits(GLOBAL_TIMER, "interface Host { setTimeout: Timer }")).toBe(
            false,
        );
    });

    it("fails a planted Date, string parsing or local-time getter, not Date.now", () => {
        for (const code of [
            'new Date("2026-11-26T09:30:00-03:00")',
            "new Date(ms)",
            "Date.parse(text)",
            "Date()",
            "at.getHours()",
            "at.getTimezoneOffset()",
        ]) {
            expect(hits(DATE_PARSING, code), code).toBe(true);
        }
        expect(hits(DATE_PARSING, "const now = Date.now();")).toBe(false);
        expect(hits(DATE_PARSING, "const d = toDate(x);")).toBe(false);
        expect(hits(DATE_PARSING, "// new Date(text) is never used")).toBe(
            false,
        );
    });

    it("fails a planted Node module or global", () => {
        expect(NODE_ONLY.test('import { readFileSync } from "node:fs";')).toBe(
            true,
        );
        expect(hits(NODE_ONLY, "process.env.TZ")).toBe(true);
    });

    it("finds `any` in an export, not in a local", () => {
        expect(
            exportedDeclarations("export type X = any;\nconst y: any = 1;"),
        ).toEqual(["export type X = any;"]);
    });

    it("finds a ported header, not a Fragiola one", () => {
        for (const header of [
            "Ported from FullCalendar (packages/core/src/seg-placement.ts), MIT",
            "Adapted from Schedule-X's event-concurrency, Copyright (c) 2023 Tom Österlund",
            "Copied from SVAR React Calendar's layout",
            "The code ported from fullcalendar's DateProfileGenerator",
        ]) {
            expect(PORTED_HEADER.test(header), header).toBe(true);
        }
        for (const header of [
            "Shaped like Flow's (fragiola/flow, x.ts), same author and licence.",
            "Lane packing, written fresh from FullCalendar's tested behaviour (more-link).",
        ]) {
            expect(PORTED_HEADER.test(header), header).toBe(false);
        }
    });
});
