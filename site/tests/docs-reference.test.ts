// From Tree (fragiola/tree, site/tests/docs-reference.test.ts), same author and licence (itself
// from Dockable's).

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { readPages } from "../contract.ts";
import { DOCS_DIR } from "../sources.ts";

// The API reference is written by hand, and this test keeps it honest.
//
// Why by hand: Fumadocs generates prop tables with fumadocs-typescript (`AutoTypeTable`), which
// drives the TypeScript compiler API to read the types. This repo pins TypeScript 7, the native
// (Go) compiler, which ships no JavaScript compiler API, so fumadocs-typescript cannot run. The
// tables live in site/docs/api/*.mdx instead, and the checks below fail when the sources and the
// pages drift apart:
//
// - every export of @fragiola/calendar-react (index.ts, parts.ts and the feature entries) is on its
//   reference page; every `Calendar.<Part>` and every feature part has its own page, whose
//   `## Props` table lists exactly the props its `<Part>Props` interface declares, and which names
//   its `data-calendar-part`; every field of every other exported interface (a state, a hook's
//   result) is a row of its page's tables; every hook has its section;
// - the core pages cover every command (with every payload and result field, from the registry
//   itself), every error code, every export of the core and of its feature entries, every field of
//   the JSON types and the settings, every member of the model and the engine, every key of their
//   `get` / `is` / `run` registries, every engine event and every feature's options;
// - the concept pages list every part and every state attribute, and every example is linked from
//   a page.
//
// Interfaces are read with regular expressions (fields are the 4-space-indented `name?:` lines of
// an `export interface … {` block), which is enough for this codebase's formatting (Biome).

const ROOT = join(import.meta.dirname, "../..");
const REACT_SRC = join(ROOT, "packages/react/src");
const CORE_SRC = join(ROOT, "packages/core/src");
const API = join(DOCS_DIR, "api");

const read = (path: string) => readFileSync(path, "utf-8");
const page = (slug: string) => read(join(API, `${slug}.mdx`));
const docsPage = (path: string) => read(join(DOCS_DIR, `${path}.mdx`));

/** What the test reads of a command in the core's registry. */
interface CommandInfo {
    name: string;
    payloadSchema: { properties?: Record<string, unknown> };
    resultSchema: { properties?: Record<string, unknown> };
}

/** The core's feature entries (`@fragiola/calendar/<entry>`) and their factories. */
const FEATURE_ENTRIES = [
    ["selection", "selection"],
    ["drag-and-drop", "dragAndDrop"],
    ["resize", "resize"],
    ["recurrence", "recurrence"],
    ["now-indicator", "nowIndicator"],
    ["constraints", "constraints"],
    ["external-drop", "externalDrop"],
    ["event-sources", "eventSources"],
] as const;

// the core, loaded at run time from its source: a computed path keeps the site's typecheck from
// checking the core too (it has its own)
const core = (await import(join(CORE_SRC, "index.ts"))) as {
    createCalendarModel(
        json: unknown,
        options: { features: readonly unknown[] },
    ): { get(key: "commands"): readonly CommandInfo[] };
    ENGINE_EVENT_CALLBACKS: Record<string, string>;
    FEATURE_KEYS: Record<string, unknown>;
};
const allFeatures = await Promise.all(
    FEATURE_ENTRIES.map(async ([entry, factory]) => {
        const module = (await import(
            join(CORE_SRC, entry, "index.ts")
        )) as Record<string, () => unknown>;
        return (module[factory] as () => unknown)();
    }),
);

/** The keys of the registry `export interface <name> { … }`: `focus`, `"day-grid"`, … */
function registryKeys(source: string, name: string): string[] {
    const body =
        new RegExp(
            `export interface ${name}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`,
        ).exec(source)?.[1] ?? "";
    return [...body.matchAll(/^ {4}"?([\w-]+)"?:/gm)].map(
        (match) => match[1] ?? "",
    );
}

/** `key` appears in the page as a quoted key in code: `` `"day-grid"` ``. */
function mentionsKey(mdx: string, key: string): boolean {
    return mdx.includes(`\`"${key}"\``);
}

/** The reference page of each module of the React package (its components, hooks, features). */
const MODULE_PAGES: Record<string, string> = {
    ...Object.fromEntries(
        readdirSync(join(REACT_SRC, "components")).map((file) => {
            const name = file.replace(/\.tsx$/, "");
            return [`./components/${name}`, name];
        }),
    ),
    ...Object.fromEntries(
        readdirSync(join(REACT_SRC, "hooks"))
            .filter((file) => file !== "internal.ts")
            .map((file) => [`./hooks/${file.replace(/\.ts$/, "")}`, "hooks"]),
    ),
    "./hooks/internal": "hooks",
    "./utils/use-render": "root",
    // the feature entries' modules, relative to their entry
    "./selection": "selection",
    "./use-selection": "hooks",
    "./drag-preview": "drag-preview",
    "../drag-and-drop/drag-preview": "drag-preview",
    "./use-drag-preview": "hooks",
    "../drag-and-drop/use-drag-preview": "hooks",
    "./resize-handle": "resize-handle",
    "./now-indicator": "now-indicator",
    "./use-now-position": "hooks",
    "./business-hours": "business-hours",
    "./use-business-hours": "hooks",
};

/** Each part's `data-calendar-part` (the collection parts render no element of their own). */
const PART_NAMES: Record<string, string | null> = {
    Root: "root",
    Previous: "previous",
    Next: "next",
    Today: "today",
    ViewButton: "view-button",
    DayGrid: "day-grid",
    ColumnHeaders: "column-headers",
    ColumnHeader: "column-header",
    Weeks: null,
    Week: "week",
    WeekNumber: "week-number",
    Days: null,
    Day: "day",
    DayEvents: "day-events",
    Segment: "segment",
    More: "more",
    TimeGrid: "time-grid",
    AllDayRow: "all-day-row",
    Scroller: "scroller",
    SlotRows: null,
    SlotRow: "slot-row",
    SlotLabel: "slot-label",
    Slots: null,
    Slot: "slot",
    Columns: "columns",
    Column: "column",
    ColumnEvents: "column-events",
    TimeEvent: "time-event",
    List: "list",
    ListDays: null,
    ListDay: "list-day",
    ListEvent: "list-event",
};

/** The feature parts: their entry, module, page and `data-calendar-part`. */
const FEATURE_PARTS = [
    ["Selection", "selection", "selection/selection.tsx", "selection"],
    [
        "DragPreview",
        "drag-and-drop",
        "drag-and-drop/drag-preview.tsx",
        "drag-preview",
    ],
    ["ResizeHandle", "resize", "resize/resize-handle.tsx", "resize-handle"],
    [
        "NowIndicator",
        "now-indicator",
        "now-indicator/now-indicator.tsx",
        "now-indicator",
    ],
    [
        "BusinessHours",
        "constraints",
        "constraints/business-hours.tsx",
        "business-hours",
    ],
] as const;

interface Export {
    name: string;
    module: string;
}

/** `export { a, type B } from "./x"` and `export type { … } from "./x"` statements. */
function namedExports(source: string): Export[] {
    const exports: Export[] = [];
    for (const match of source.matchAll(
        /export (?:type )?\{([^}]*)\} from "([^"]+)"/g,
    )) {
        const [, names = "", module = ""] = match;
        for (const raw of names.split(",")) {
            const name = raw
                .trim()
                .replace(/^type\s+/, "")
                .split(/\s+as\s+/)
                .pop();
            if (name) exports.push({ name, module });
        }
    }
    return exports;
}

/**
 * The fields of `export interface <name> … { … }` (or of `export type <name> … = { … }`) in
 * `source`, or undefined when absent. `extendsNames` are the names in its heritage clause.
 */
function interfaceFields(
    source: string,
    name: string,
): { fields: string[]; extendsNames: string[] } | undefined {
    // an empty body (`extends DivPrimitiveProps<State> {}`) is a body too
    const declared = new RegExp(
        `export interface ${name}\\b([^{]*)\\{(?:\\}|([\\s\\S]*?)\\n\\})`,
    ).exec(source);
    const aliased = new RegExp(
        `export type ${name}\\b(?:<[^>]*>)?\\s*= \\{([\\s\\S]*?)\\n\\}`,
    ).exec(source);
    if (!declared && !aliased) return undefined;
    const heritage = declared?.[1] ?? "";
    const body = (declared ? declared[2] : aliased?.[1]) ?? "";
    const fields = [...body.matchAll(/^ {4}(?:readonly )?(\w+)\??:/gm)].map(
        (field) => field[1] ?? "",
    );
    // the bases after `extends`: not the type parameters (`<T extends …>`), not type arguments
    const bases = heritage
        .replace(/^\s*<[\s\S]*?>\s*(?=extends|$)/, "")
        .replace(/<[^>]*>/g, "")
        .replace(/^\s*extends\b/, "");
    const extendsNames = [...bases.matchAll(/\b([A-Z]\w*)\b/g)].map(
        (base) => base[1] ?? "",
    );
    return { fields, extendsNames };
}

/** The first-cell names of every markdown table row: `` | `name(…)` | `` gives `name`. */
function tableRowNames(mdx: string): Set<string> {
    const names = new Set<string>();
    for (const match of mdx.matchAll(/^\| `([^`]+)`/gm)) {
        const cell = match[1] ?? "";
        names.add(cell.split(/[(<\s]/)[0] ?? cell);
    }
    return names;
}

/** The part of a page under `## <heading>`, up to the next `##`. */
function section(mdx: string, heading: string): string | undefined {
    const start = mdx.search(new RegExp(`^## ${heading}$`, "m"));
    if (start < 0) return undefined;
    const rest = mdx.slice(start).replace(/^.*\n/, "");
    const end = rest.search(/^## /m);
    return end < 0 ? rest : rest.slice(0, end);
}

/** `name` appears in the page as code: `` `name` ``, `` `name<…>` ``, `` `name(…)` ``. */
function mentions(mdx: string, name: string): boolean {
    return new RegExp(`\`${name}[\`<(.]`).test(mdx);
}

const index = read(join(REACT_SRC, "index.ts"));
const parts = read(join(REACT_SRC, "parts.ts"));
const indexExports = namedExports(index);
const partExports = namedExports(parts);

function sourceOf(module: string, base = REACT_SRC): string {
    const file = join(base, module.replace(/^\.\//, ""));
    try {
        return read(`${file}.tsx`);
    } catch {
        return read(`${file}.ts`);
    }
}

/** The `## Props` rows of a page are exactly the fields of `propsName` in `source`. */
function expectPropsTable(
    slug: string,
    source: string,
    propsName: string,
): number {
    const props = interfaceFields(source, propsName);
    expect(props, propsName).toBeDefined();
    const table = section(page(slug), "Props");
    expect(table, `## Props on api/${slug}.mdx`).toBeDefined();
    expect(
        [...tableRowNames(table ?? "")].sort(),
        `the ## Props rows of api/${slug}.mdx are ${propsName}' own props`,
    ).toEqual([...(props?.fields ?? [])].sort());
    // a part on the primitive props links them (the root page holds them)
    const primitive = props?.extendsNames.some((base) =>
        base.endsWith("PrimitiveProps"),
    );
    if (primitive && slug !== "root") {
        expect(table, `api/${slug}.mdx links the common props`).toContain(
            "/docs/api/root#common-props",
        );
    }
    return props?.fields.length ?? 0;
}

/** An API page opens with a behaviour summary and shows a typed snippet. */
function expectApiPage(slug: string) {
    const mdx = page(slug);
    expect(mdx, `api/${slug}.mdx has a ## Behaviour`).toMatch(
        /^## Behaviour$/m,
    );
    expect(mdx, `api/${slug}.mdx has a tsx snippet`).toMatch(/^```tsx/m);
}

describe("the React reference", () => {
    it("re-exports the core and exports the Calendar namespace from parts.ts", () => {
        expect(index).toMatch(/^export \* from "@fragiola\/calendar";$/m);
        expect(index).toMatch(/export \* as Calendar from "\.\/parts"/);
    });

    it("has a page for every module the package exports from", () => {
        const modules = new Set(
            [...indexExports, ...partExports].map((entry) => entry.module),
        );
        for (const module of modules) {
            expect(
                MODULE_PAGES,
                `no reference page for ${module}`,
            ).toHaveProperty(module);
        }
    });

    it("documents every part as Calendar.<Part> on its own page, with its data-calendar-part", () => {
        expect(partExports.map((entry) => entry.name).sort()).toEqual(
            Object.keys(PART_NAMES).sort(),
        );
        for (const { name, module } of partExports) {
            const slug = MODULE_PAGES[module] ?? "";
            const mdx = page(slug);
            expect(mdx, `api/${slug}.mdx`).toMatch(
                new RegExp(`^title: Calendar\\.${name}$`, "m"),
            );
            expectApiPage(slug);
            const part = PART_NAMES[name];
            if (part) {
                expect(mdx, `api/${slug}.mdx`).toContain(
                    `\`data-calendar-part="${part}"\``,
                );
            }
        }
    });

    it("names every part the core gives (data-calendar-part)", () => {
        const adapter = read(join(CORE_SRC, "engine/adapter.ts"));
        const registered = registryKeys(adapter, "PartPayloadMap");
        expect(registered.length).toBeGreaterThan(20);
        // an event is named where it shows
        const named = new Set([
            ...Object.values(PART_NAMES).filter(Boolean),
            ...FEATURE_PARTS.map((entry) => entry[3]),
            "event",
        ]);
        expect(registered.filter((part) => !named.has(part))).toEqual([]);
    });

    it("mentions every named export on its module's page", () => {
        expect(indexExports.length).toBeGreaterThan(40);
        for (const { name, module } of indexExports) {
            const slug = MODULE_PAGES[module] ?? "";
            expect(
                mentions(page(slug), name),
                `${name} on api/${slug}.mdx`,
            ).toBe(true);
        }
    });

    it("lists exactly the props of <Part>Props in each part's ## Props table", () => {
        let checked = 0;
        for (const { name, module } of partExports) {
            const slug = MODULE_PAGES[module] ?? "";
            // the root's own props: `RootProps<T, F>` adds the engine's and the callbacks
            const propsName =
                name === "Root" ? "RootBaseProps" : `${name}Props`;
            checked += expectPropsTable(slug, sourceOf(module), propsName);
        }
        // the parser found the props (a formatting change must not silently pass)
        expect(checked).toBeGreaterThan(40);
    });

    it("documents the root's engine options and every engine event's callback", () => {
        const mdx = page("root");
        const engine = section(mdx, "Engine props") ?? "";
        for (const option of [
            "host",
            "longPressDelay",
            "dragThreshold",
            "autoScroll",
        ]) {
            expect(tableRowNames(engine).has(option), option).toBe(true);
        }
        const events = tableRowNames(section(mdx, "Event props") ?? "");
        for (const callback of Object.values(core.ENGINE_EVENT_CALLBACKS)) {
            expect(events.has(`on${callback}`), `on${callback}`).toBe(true);
        }
    });

    it("has a table row for every field of every other exported interface", () => {
        let checked = 0;
        for (const { name, module } of indexExports) {
            if (name.endsWith("Props")) continue; // the ## Props tables, above
            const found = interfaceFields(sourceOf(module), name);
            if (!found) continue;
            const slug = MODULE_PAGES[module] ?? "";
            const rows = tableRowNames(page(slug));
            for (const field of found.fields) {
                checked++;
                expect(
                    rows.has(field),
                    `${name}.${field} has no row on api/${slug}.mdx`,
                ).toBe(true);
            }
        }
        expect(checked).toBeGreaterThan(30);
    });

    it("documents the common props on the root page", () => {
        const common = interfaceFields(
            read(join(REACT_SRC, "utils/use-render.ts")),
            "PrimitiveProps",
        )?.fields;
        expect(common).toEqual(["render", "className", "style", "ref"]);
        const rows = tableRowNames(section(page("root"), "Common props") ?? "");
        for (const field of common ?? []) {
            expect(rows.has(field), `PrimitiveProps.${field}`).toBe(true);
        }
    });

    it("gives every hook its own section on the hooks page", () => {
        const mdx = page("hooks");
        const featureHooks = FEATURE_PARTS.flatMap(([, entry]) =>
            namedExports(read(join(REACT_SRC, entry, "index.ts"))),
        ).filter((entry) => /^use[A-Z]/.test(entry.name));
        const hooks = [...indexExports, ...featureHooks].filter((entry) =>
            /^(use|create)[A-Z]/.test(entry.name),
        );
        expect(hooks.length).toBeGreaterThan(18);
        for (const { name } of hooks) {
            expect(mdx, `## \`${name}\` on api/hooks.mdx`).toMatch(
                new RegExp(`^## \`${name}\``, "m"),
            );
        }
    });
});

describe("the React feature entries", () => {
    it("re-export the core's feature entry", () => {
        for (const [entry] of FEATURE_ENTRIES) {
            expect(read(join(REACT_SRC, entry, "index.ts"))).toMatch(
                new RegExp(
                    `^export \\* from "@fragiola/calendar/${entry}";$`,
                    "m",
                ),
            );
        }
    });

    it("give every feature part its own page, with its props and its data-calendar-part", () => {
        for (const [name, entry, file, part] of FEATURE_PARTS) {
            const slug = part;
            const mdx = page(slug);
            expect(mdx).toMatch(new RegExp(`^title: ${name}$`, "m"));
            expect(mdx, `api/${slug}.mdx names its entry`).toContain(
                `@fragiola/calendar-react/${entry}`,
            );
            expect(mdx).toContain(`\`data-calendar-part="${part}"\``);
            expectApiPage(slug);
            const source = read(join(REACT_SRC, file));
            expectPropsTable(slug, source, `${name}Props`);
            const rows = tableRowNames(mdx);
            for (const field of interfaceFields(source, `${name}State`)
                ?.fields ?? []) {
                expect(rows.has(field), `${name}State.${field}`).toBe(true);
            }
        }
    });

    it("mention every export of the feature entries on an API page", () => {
        const pages = readdirSync(API)
            .filter((file) => file.endsWith(".mdx"))
            .map((file) => read(join(API, file)));
        const names = FEATURE_ENTRIES.flatMap(([entry]) => [
            ...namedExports(read(join(REACT_SRC, entry, "index.ts"))),
            ...namedExports(read(join(CORE_SRC, entry, "index.ts"))),
        ]).map((entry) => entry.name);
        // the factories, defined in the entries themselves
        names.push(...FEATURE_ENTRIES.map(([, factory]) => factory));
        const missing = names.filter(
            (name) => !pages.some((mdx) => mentions(mdx, name)),
        );
        expect(missing, "feature exports no API page mentions").toEqual([]);
    });
});

describe("the concept pages", () => {
    it("list every part name on the state attributes page", () => {
        const mdx = docsPage("concepts/state-attributes");
        const names = [
            ...Object.values(PART_NAMES).filter(
                (part): part is string => part !== null,
            ),
            ...FEATURE_PARTS.map((entry) => entry[3]),
        ];
        expect(names.length).toBeGreaterThan(30);
        for (const name of names) {
            expect(mdx, `part "${name}"`).toContain(`\`${name}\``);
        }
    });

    it("list every state attribute", () => {
        const sources = [CORE_SRC, REACT_SRC]
            .flatMap((dir) =>
                readdirSync(dir, { recursive: true, encoding: "utf-8" })
                    .filter((file) => /\.tsx?$/.test(file))
                    .map((file) => read(join(dir, file))),
            )
            .join("\n");
        const attributes = new Set(
            [...sources.matchAll(/"(data-(?!calendar-part)[\w-]+)"/g)].map(
                (match) => match[1] ?? "",
            ),
        );
        expect(attributes.size).toBeGreaterThan(20);
        const rows = tableRowNames(docsPage("concepts/state-attributes"));
        for (const attribute of attributes) {
            expect(rows.has(attribute), `${attribute} row`).toBe(true);
        }
    });

    it("name the layout's custom properties", () => {
        const mdx = docsPage("concepts/layout");
        for (const property of [
            "--calendar-lane-size",
            "--calendar-day-gap",
            "--calendar-row-inset",
        ]) {
            expect(mdx, property).toContain(`\`${property}\``);
        }
    });

    it("explain when a children function is called again", () => {
        for (const path of ["concepts/composition", "guides/performance"]) {
            const mdx = docsPage(path);
            expect(mdx, path).toContain("useCallback");
        }
    });

    it("link every example from a page", () => {
        const pages = [...readPages(DOCS_DIR).values()].join("\n");
        const examples = readdirSync(
            join(ROOT, "examples/shared/src/meta"),
        ).map((file) => file.replace(/\.ts$/, ""));
        expect(examples).toHaveLength(25);
        for (const id of examples) {
            expect(
                pages.includes(`<Example id="${id}"`) ||
                    pages.includes(`(/examples/${id})`),
                `example ${id} is linked from no page`,
            ).toBe(true);
        }
    });
});

describe("the core reference", () => {
    const commands = core
        .createCalendarModel(
            { version: 1, events: [], calendars: [], settings: {} },
            { features: allFeatures },
        )
        .get("commands");
    const commandsPage = page("commands");

    /** The part of the commands page about one command: from its `###` to the next heading. */
    function commandSection(name: string): string {
        const heading = `### \`${name}\``;
        const start = commandsPage.indexOf(heading);
        if (start < 0) return "";
        const rest = commandsPage.slice(start + heading.length);
        const end = rest.search(/^#{2,3} /m);
        return end < 0 ? rest : rest.slice(0, end);
    }

    it("has a section for every command of the registry, with every payload and result field", () => {
        expect(commands.length).toBeGreaterThan(20);
        for (const info of commands) {
            const text = commandSection(info.name);
            expect(text, `### \`${info.name}\` on api/commands.mdx`).not.toBe(
                "",
            );
            const rows = tableRowNames(text);
            for (const schema of [info.payloadSchema, info.resultSchema]) {
                for (const field of Object.keys(schema.properties ?? {})) {
                    expect(rows.has(field), `${info.name}.${field}`).toBe(true);
                }
            }
        }
    });

    it("documents the command bus and every error code", () => {
        const mdx = page("command-bus");
        for (const method of [
            "run",
            "dispatch",
            "can",
            "check",
            "use",
            "subscribe",
            "get",
            "is",
        ]) {
            expect(mdx, `model.${method}`).toContain(`model.${method}`);
        }
        expect(mdx).toContain("`batch`");
        expect(mdx).toContain('model.get("commands")');
        const source = read(join(CORE_SRC, "commands/types.ts"));
        const union =
            /export type CommandErrorCode =([^;]+);/.exec(source)?.[1] ?? "";
        const codes = [...union.matchAll(/"(\w+)"/g)].map((m) => m[1] ?? "");
        expect(codes.length).toBeGreaterThan(5);
        for (const code of codes) {
            expect(mdx, `error code ${code}`).toContain(`\`${code}\``);
        }
    });

    it("mentions every export of the core on an API page", () => {
        const coreIndex = read(join(CORE_SRC, "index.ts"));
        const names = namedExports(coreIndex).map((entry) => entry.name);
        expect(coreIndex).not.toMatch(/export \* from/);
        expect(names.length).toBeGreaterThan(150);
        const pages = readdirSync(API)
            .filter((file) => file.endsWith(".mdx"))
            .map((file) => read(join(API, file)));
        const missing = names.filter(
            (name) => !pages.some((mdx) => mentions(mdx, name)),
        );
        expect(missing, "exports no API page mentions").toEqual([]);
    });

    it("has a table row for every field of the JSON types", () => {
        const document = read(join(CORE_SRC, "document/calendar-document.ts"));
        const rows = tableRowNames(page("json-document"));
        let checked = 0;
        for (const name of [
            "EventFlags",
            "RecurrenceJson",
            "EventSource",
            "CalendarEventInit",
            "CalendarInfoJson",
            "ValidRangeJson",
            "ViewJson",
            "CalendarDocument",
        ]) {
            const fields = interfaceFields(document, name)?.fields ?? [];
            expect(fields.length, name).toBeGreaterThan(0);
            for (const field of fields) {
                checked++;
                expect(rows.has(field), `${name}.${field}`).toBe(true);
            }
        }
        // `data` comes from DataField, outside the types' braces
        expect(rows.has("data")).toBe(true);
        expect(checked).toBeGreaterThan(25);
    });

    it("has a table row for every setting, and its default", () => {
        const document = read(join(CORE_SRC, "document/calendar-document.ts"));
        const settings = interfaceFields(document, "CalendarSettingsJson");
        expect(settings?.fields.length ?? 0).toBeGreaterThan(20);
        const mdx = page("settings");
        const rows = tableRowNames(mdx);
        for (const field of settings?.fields ?? []) {
            expect(rows.has(field), `settings.${field}`).toBe(true);
        }
        for (const name of ["BusinessHours", "ConstraintRange"]) {
            for (const field of interfaceFields(document, name)?.fields ?? []) {
                expect(rows.has(field), `${name}.${field}`).toBe(true);
            }
        }
        expect(mdx).toContain("`DEFAULT_SETTINGS`");
    });

    /** The members of `export interface <name>`: its 4-space-indented fields and methods. */
    function members(source: string, name: string): string[] {
        const start = source.indexOf(`export interface ${name}`);
        expect(start, name).toBeGreaterThanOrEqual(0);
        const body = source.slice(start, source.indexOf("\n}\n", start));
        return [
            ...new Set(
                [...body.matchAll(/^ {4}(?:readonly )?(\w+)[<(:?]/gm)].map(
                    (match) => match[1] ?? "",
                ),
            ),
        ];
    }

    it("documents every member of the engine, of its options, of its host and of its adapter", () => {
        const engine = read(join(CORE_SRC, "engine/calendar-engine.ts"));
        const adapter = read(join(CORE_SRC, "engine/adapter.ts"));
        const host = read(join(CORE_SRC, "engine/engine-host.ts"));
        const engineMembers = members(engine, "CalendarEngine<");
        expect(engineMembers.sort()).toEqual(
            [
                "adapter",
                "can",
                "check",
                "destroy",
                "get",
                "is",
                "run",
                "subscribe",
            ].sort(),
        );
        const mdx = page("engine");
        const rows = tableRowNames(mdx);
        const all = [
            ...engineMembers,
            ...members(engine, "CalendarEngineOptions"),
            ...members(host, "EngineHost"),
            ...members(adapter, "CalendarEngineAdapter"),
        ];
        expect(all.length).toBeGreaterThan(20);
        for (const member of all) {
            expect(rows.has(member), `${member} on api/engine.mdx`).toBe(true);
        }
    });

    it("lists every key of the engine's run, get and is, and every engine event", () => {
        const verbs = read(join(CORE_SRC, "engine/verbs.ts"));
        const mdx = page("engine");
        const keys = [
            ...registryKeys(verbs, "EngineRunMap"),
            ...registryKeys(verbs, "EngineGetMap"),
            ...registryKeys(verbs, "EngineIsMap"),
            ...Object.keys(core.ENGINE_EVENT_CALLBACKS),
        ];
        expect(keys.length).toBeGreaterThan(20);
        for (const key of keys) {
            expect(mentionsKey(mdx, key), `"${key}" on api/engine.mdx`).toBe(
                true,
            );
        }
    });

    it("lists every key of the model's get and is, and every member of the model", () => {
        const queries = read(join(CORE_SRC, "state/queries.ts"));
        const mdx = page("model");
        const keys = [
            ...registryKeys(queries, "ModelGetMap"),
            ...registryKeys(queries, "ModelIsMap"),
        ];
        expect(keys.length).toBeGreaterThan(35);
        for (const key of keys) {
            expect(mentionsKey(mdx, key), `"${key}" on api/model.mdx`).toBe(
                true,
            );
        }
        const source = read(join(CORE_SRC, "model/calendar-model.ts"));
        const model = members(source, "CalendarModel<");
        expect(model.sort()).toEqual(
            [
                "can",
                "check",
                "dispatch",
                "get",
                "is",
                "run",
                "state",
                "subscribe",
                "use",
            ].sort(),
        );
        const rows = tableRowNames(mdx);
        for (const member of [
            ...model,
            ...members(source, "CalendarModelOptions"),
        ]) {
            expect(rows.has(member), `${member} on api/model.mdx`).toBe(true);
        }
    });

    it("documents every feature, its options and its names", () => {
        const mdx = page("features");
        const rows = tableRowNames(mdx);
        for (const [entry, factory] of FEATURE_ENTRIES) {
            expect(mdx, factory).toContain(`\`${factory}(`);
            expect(mdx, entry).toContain(`@fragiola/calendar/${entry}`);
            const source = read(join(CORE_SRC, entry, "index.ts"));
            const options = /export interface (\w+Options)\b/.exec(source)?.[1];
            if (!options) continue;
            for (const field of interfaceFields(source, options)?.fields ??
                []) {
                expect(rows.has(field), `${options}.${field}`).toBe(true);
            }
        }
        for (const name of Object.keys(core.FEATURE_KEYS)) {
            expect(mdx, `feature "${name}"`).toContain(`\`"${name}"\``);
        }
    });
});

// a sanity check on the helpers the tests above rely on
describe("the reference helpers", () => {
    it("cut a page at its ## headings", () => {
        const mdx = "## Props\n\n| `a` | x |\n\n## State\n\n| `b` | y |\n";
        expect([...tableRowNames(section(mdx, "Props") ?? "")]).toEqual(["a"]);
        expect(relative(ROOT, API)).toBe(join("site", "docs", "api"));
    });

    it("read an interface's fields and bases", () => {
        const source =
            "export interface AProps<T extends X = Y>\n    extends DivPrimitiveProps<AState> {\n    a?: number;\n    readonly b: string;\n}\n";
        expect(interfaceFields(source, "AProps")).toEqual({
            fields: ["a", "b"],
            extendsNames: ["DivPrimitiveProps"],
        });
    });
});
