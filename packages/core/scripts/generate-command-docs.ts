// Writes site/docs/api/commands.mdx from the command catalogue, so the reference cannot drift from
// the code. With `--check`, fails instead when the committed page differs. Shaped like Dockable's
// and Tree's (fragiola/dockable, fragiola/tree, packages/core/scripts/generate-command-docs.ts).
//
// It reads the built package (`dist/index.js`, `pnpm --filter @fragiola/calendar build`). Until the
// core exports `createCalendarModel` (Issue #3) there is no catalogue: the expected page is none,
// and `--check` fails only when a page was committed anyway.
//
//   node packages/core/scripts/generate-command-docs.ts [--check]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

/** A command as `model.get("commands")` lists it. */
interface CommandInfo {
    readonly name: string;
    readonly description: string;
}

/** The part of the built core this script reads. */
interface Core {
    createCalendarModel?: (json?: unknown) => {
        get(key: "commands"): readonly CommandInfo[];
    };
}

const ROOT = join(import.meta.dirname, "../../..");
const OUT = join(ROOT, "site/docs/api/commands.mdx");
const ENTRY = join(import.meta.dirname, "../dist/index.js");

/** The page for a catalogue: a heading per command and its description. */
export function renderPage(commands: readonly CommandInfo[]): string {
    return [
        "---",
        "title: Commands",
        "description: Every command of the calendar model, generated from its catalogue.",
        "---",
        "",
        ...commands.flatMap((command) => [
            `## \`${command.name}\``,
            "",
            command.description,
            "",
        ]),
    ].join("\n");
}

/** The page the built core describes, or `undefined` while it has no catalogue. */
async function expectedPage(): Promise<string | undefined> {
    const core = (await import(pathToFileURL(ENTRY).href)) as Core;
    if (core.createCalendarModel === undefined) return undefined;
    return renderPage(core.createCalendarModel().get("commands"));
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
        console.log(
            expected === undefined
                ? "check:commands: no command catalogue yet, and no page"
                : "check:commands: site/docs/api/commands.mdx is current",
        );
        return;
    }
    if (expected === undefined) {
        console.log("generate-command-docs: no command catalogue yet");
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
