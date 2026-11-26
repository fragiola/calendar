// Writes site/docs/api/commands.mdx from the command catalogue, so the reference cannot drift from
// the code: each command's description, its payload and result fields (from its JSON Schemas), an
// example run from code and as JSON. With `--check`, fails instead when the committed page
// differs. Shaped like Dockable's and Tree's (fragiola/dockable, fragiola/tree,
// packages/core/scripts/generate-command-docs.ts), same author and licence.
//
// It reads the built package (`dist/index.js`, `pnpm --filter @fragiola/calendar build`). Every
// example runs on a sample calendar: one the bus refuses as malformed fails the script, so the page
// never shows a payload that does not work. A feature's commands get their own section, with how
// to install the feature (each feature's built entry, `dist/<subpath>.js`).
//
//   node packages/core/scripts/generate-command-docs.ts [--check]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

interface JsonSchema {
    readonly description?: string;
    readonly type?: string;
    readonly properties?: Record<string, JsonSchema>;
    readonly required?: readonly string[];
    readonly enum?: readonly unknown[];
    readonly const?: unknown;
    readonly items?: JsonSchema;
    readonly anyOf?: readonly JsonSchema[];
    readonly oneOf?: readonly JsonSchema[];
}

/** A command as `model.get("commands")` lists it. */
export interface CommandInfo {
    readonly name: string;
    readonly description: string;
    readonly payloadSchema: JsonSchema;
    readonly resultSchema: JsonSchema;
    readonly transient: boolean;
}

interface CommandResult {
    readonly ok: boolean;
    readonly error?: { code: string; message: string; path?: string };
}

/** The part of the built core this script reads. */
interface Core {
    createCalendarModel(
        json?: unknown,
        options?: { now?: () => number; features?: readonly unknown[] },
    ): {
        get(key: "commands"): readonly CommandInfo[];
        dispatch(input: unknown): CommandResult;
    };
    /** the names each feature owns */
    readonly FEATURE_KEYS: Readonly<
        Record<string, { readonly commands: readonly string[] }>
    >;
}

const ROOT = join(import.meta.dirname, "../../..");
const OUT = join(ROOT, "site/docs/api/commands.mdx");
const ENTRY = join(import.meta.dirname, "../dist/index.js");

/** The features that have commands: their entry, factory and section title. */
const FEATURE_SECTIONS: readonly {
    readonly subpath: string;
    readonly factory: string;
    readonly title: string;
}[] = [
    { subpath: "recurrence", factory: "recurrence", title: "Recurrence" },
    {
        subpath: "event-sources",
        factory: "eventSources",
        title: "Event sources",
    },
];

/** The sections of the page, and the commands in each. */
const GROUPS: readonly [title: string, prefix: string][] = [
    ["Events", "event."],
    ["Calendars", "calendar."],
    ["Settings", "settings."],
    ["View and navigation", "view."],
    ["Batches", "batch"],
];

/** The sample calendar every example runs on. */
const SAMPLE = {
    version: 1,
    calendars: [{ id: "work", title: "Work" }],
    events: [
        {
            id: "standup",
            title: "Standup",
            start: "2026-11-26T09:30:00-03:00",
            end: "2026-11-26T09:45:00-03:00",
            allDay: false,
            calendarId: "work",
        },
        {
            id: "trip",
            title: "Trip",
            start: "2026-11-27",
            end: "2026-11-30",
            allDay: true,
        },
    ],
    settings: { timeZone: "America/Sao_Paulo", locale: "pt-BR" },
};

/** The sample with what the features' examples read: an event source. */
const FEATURE_SAMPLE = {
    ...SAMPLE,
    settings: { ...SAMPLE.settings, eventSources: [{ id: "holidays" }] },
};

/** The sample's clock: 2026-11-26 12:00 UTC. */
const NOW = 1_795_694_400_000;

/** Every command's example payload: what the reference shows (run on the sample). */
const EXAMPLES: Record<string, unknown> = {
    "event.add": {
        title: "Review",
        start: "2026-11-26T14:00:00-03:00",
        end: "2026-11-26T15:00:00-03:00",
        allDay: false,
        calendarId: "work",
    },
    "event.update": { eventId: "standup", title: "Daily standup" },
    "event.move": { eventId: "standup", delta: { days: 1 } },
    "event.resize": {
        eventId: "standup",
        edge: "end",
        to: "2026-11-26T10:00:00-03:00",
    },
    "event.remove": { eventId: "trip" },
    "event.set-data": { eventId: "standup", data: { room: "Blue" } },
    "event.set-flags": { eventId: "standup", durationEditable: false },
    "calendar.add": { id: "home", title: "Home" },
    "calendar.update": { calendarId: "work", editable: false },
    "calendar.remove": { calendarId: "work", events: "keep" },
    "calendar.set-visible": { calendarId: "work", visible: false },
    "settings.set": { settings: { firstDayOfWeek: 1, hiddenDays: [0, 6] } },
    "view.set": { type: "days", days: 3 },
    "view.go-to": { date: "2026-12-24" },
    "view.next": {},
    "view.previous": {},
    "view.today": {},
    batch: {
        commands: [
            { command: "view.set", payload: { type: "week" } },
            { command: "view.next", payload: {} },
        ],
    },
    "event.set-recurrence": {
        eventId: "standup",
        recurrence: {
            rule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
            exdates: ["2026-11-27T09:30:00-03:00"],
        },
    },
    "event-sources.receive": {
        sourceId: "holidays",
        range: { start: "2026-11-01", end: "2026-12-01" },
        events: [
            {
                id: "republic-day",
                title: "Republic Day",
                start: "2026-11-15",
                end: "2026-11-16",
                allDay: true,
            },
        ],
    },
    "event-sources.invalidate": { sourceId: "holidays" },
    "event-sources.set-loading": {
        sourceId: "holidays",
        range: { start: "2026-11-01", end: "2026-12-01" },
        loading: true,
    },
};

/** A short type for a schema: `string`, `integer`, `"this" \| "all"`, `string[]`, … */
function typeOf(schema: JsonSchema): string {
    if (schema.const !== undefined) return JSON.stringify(schema.const);
    if (schema.enum) {
        return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
    }
    const alternatives = schema.anyOf ?? schema.oneOf;
    if (alternatives) {
        return [...new Set(alternatives.map(typeOf))].join(" | ");
    }
    if (schema.type === "array") {
        return `${schema.items ? typeOf(schema.items) : "unknown"}[]`;
    }
    return schema.type ?? "JSON";
}

/**
 * Prose from a schema or a description, safe in MDX: a token with `<`, `>`, `{` or `}` (MDX reads
 * them as JSX) goes into a code span, unless it is in one already. From Tree's.
 */
function prose(text: string): string {
    return text
        .split(/(`[^`]*`)/)
        .map((part, i) =>
            i % 2 === 1
                ? part
                : part.replace(/[^\s`]*[<>{}][^\s`]*/g, (token) => {
                      const [, leading = "", core = token, trailing = ""] =
                          /^([("']*)(.*?)([.,;:)"']*)$/.exec(token) ?? [];
                      return `${leading}\`${core}\`${trailing}`;
                  }),
        )
        .join("");
}

/** A Markdown table cell: pipes escaped, one line. */
function cell(text: string): string {
    return text.replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function fieldTable(schema: JsonSchema): string {
    const properties = Object.entries(schema.properties ?? {});
    if (properties.length === 0) return "No fields.";
    const required = new Set(schema.required ?? []);
    return [
        "| field | type | required | description |",
        "| --- | --- | --- | --- |",
        ...properties.map(
            ([name, field]) =>
                `| \`${name}\` | \`${cell(typeOf(field))}\` | ${required.has(name) ? "yes" : "no"} | ${cell(prose(field.description ?? ""))} |`,
        ),
    ].join("\n");
}

/** A schema's fields: one table, or one per shape of an `anyOf`. */
function fields(schema: JsonSchema): string[] {
    const shapes = schema.anyOf ?? schema.oneOf;
    if (!shapes) return [fieldTable(schema)];
    return shapes.flatMap((shape, i) => [
        `One of (${i + 1} of ${shapes.length}):`,
        "",
        fieldTable(shape),
        "",
    ]);
}

function section(command: CommandInfo): string[] {
    const example = EXAMPLES[command.name];
    const payload = JSON.stringify(example);
    return [
        `### \`${command.name}\``,
        "",
        prose(command.description),
        "",
        "**Payload**",
        "",
        ...fields(command.payloadSchema),
        "",
        "**Result**",
        "",
        ...fields(command.resultSchema),
        "",
        ...(command.transient
            ? ["It may run as a transient step (`{ transient: true }`).", ""]
            : []),
        "```ts",
        `model.run("${command.name}", ${payload});`,
        `model.dispatch(${JSON.stringify({ command: command.name, payload: example })});`,
        "```",
        "",
    ];
}

/** A feature's commands, as the page lists them. */
export interface FeatureCommands {
    readonly title: string;
    readonly subpath: string;
    readonly factory: string;
    readonly commands: readonly CommandInfo[];
}

/** The page for a catalogue: the core's commands by section, then each feature's. */
export function renderPage(
    commands: readonly CommandInfo[],
    features: readonly FeatureCommands[] = [],
): string {
    const listed = new Set<string>();
    const body = GROUPS.flatMap(([title, prefix]) => {
        const members = commands.filter((command) =>
            prefix.endsWith(".")
                ? command.name.startsWith(prefix)
                : command.name === prefix,
        );
        for (const command of members) listed.add(command.name);
        return members.length === 0
            ? []
            : [`## ${title}`, "", ...members.flatMap(section)];
    });
    const featureBody = features.flatMap((feature) => [
        `## ${feature.title}`,
        "",
        `With the \`${feature.factory}()\` feature installed:`,
        "",
        "```ts",
        `import { ${feature.factory} } from "@fragiola/calendar/${feature.subpath}";`,
        "",
        `const model = createCalendarModel(json, { features: [${feature.factory}()] });`,
        "```",
        "",
        "Without it, its commands are `not_found`.",
        "",
        ...feature.commands.flatMap(section),
    ]);
    const unlisted = commands.filter((command) => !listed.has(command.name));
    if (unlisted.length > 0) {
        throw new Error(
            `no section lists ${unlisted.map((command) => command.name).join(", ")}`,
        );
    }
    return [
        "---",
        "title: Commands",
        "description: Every command of the calendar model, generated from its catalogue.",
        "---",
        "",
        "{/* Generated by packages/core/scripts/generate-command-docs.ts: do not edit by hand. */}",
        "",
        "Every change to a calendar is a command: `model.run(name, payload)` from code, or",
        "`model.dispatch({ command, payload })` for untrusted JSON. A command never throws on bad",
        "input: it returns `{ ok: true, value }` or `{ ok: false, error: { code, message, path } }`",
        "with the codes `unknown_command`, `invalid_payload`, `not_found`, `refused`, `vetoed`,",
        '`queued` and `middleware_error`. `model.get("commands")` lists the same commands with their',
        "JSON Schemas, ready to become an assistant's tools.",
        "",
        ...body,
        ...featureBody,
    ].join("\n");
}

/** Runs every example on the sample: a malformed one is the script's bug. */
function checkExamples(
    core: Core,
    commands: readonly CommandInfo[],
    features: readonly unknown[] = [],
): void {
    for (const command of commands) {
        if (!(command.name in EXAMPLES)) {
            throw new Error(`no example for "${command.name}"`);
        }
        const model = core.createCalendarModel(
            features.length === 0 ? SAMPLE : FEATURE_SAMPLE,
            { now: () => NOW, features },
        );
        const result = model.dispatch({
            command: command.name,
            payload: EXAMPLES[command.name],
        });
        if (!result.ok) {
            throw new Error(
                `the example of "${command.name}" fails: ${result.error?.code} ${result.error?.path ?? ""} ${result.error?.message}`,
            );
        }
    }
}

async function expectedPage(): Promise<string> {
    const core = (await import(pathToFileURL(ENTRY).href)) as Core;
    const commands = core
        .createCalendarModel(SAMPLE, { now: () => NOW })
        .get("commands");
    checkExamples(core, commands);
    const all = await Promise.all(
        FEATURE_SECTIONS.map(async (feature) => {
            const entry = (await import(
                pathToFileURL(
                    join(import.meta.dirname, `../dist/${feature.subpath}.js`),
                ).href
            )) as Record<string, () => unknown>;
            const make = entry[feature.factory];
            if (typeof make !== "function") {
                throw new Error(
                    `dist/${feature.subpath}.js exports no ${feature.factory}()`,
                );
            }
            return make();
        }),
    );
    const coreNames = new Set(commands.map((command) => command.name));
    const featureCommands = core
        .createCalendarModel(FEATURE_SAMPLE, { now: () => NOW, features: all })
        .get("commands")
        .filter((command) => !coreNames.has(command.name));
    checkExamples(core, featureCommands, all);
    const sections = FEATURE_SECTIONS.map((feature) => ({
        ...feature,
        commands: featureCommands.filter((command) =>
            (core.FEATURE_KEYS[feature.subpath]?.commands ?? []).includes(
                command.name,
            ),
        ),
    }));
    return renderPage(commands, sections);
}

async function main(check: boolean): Promise<void> {
    const expected = await expectedPage();
    const actual = existsSync(OUT) ? readFileSync(OUT, "utf8") : undefined;
    if (check) {
        if (expected !== actual) {
            console.error(
                "site/docs/api/commands.mdx is out of date: run `pnpm --filter @fragiola/calendar generate:commands`",
            );
            process.exit(1);
        }
        console.log("check:commands: site/docs/api/commands.mdx is current");
        return;
    }
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, expected);
    console.log("generate-command-docs: wrote site/docs/api/commands.mdx");
}

// only when run, not when a test imports it
if (import.meta.main) {
    await main(process.argv.includes("--check"));
}
