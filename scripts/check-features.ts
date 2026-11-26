// The features' bundle guard: a feature not imported is not in the app's bundle. Fails when the
// main entry of a package (`packages/*/dist/index.js`, or ng-packagr's
// `dist/fesm2022/<package>.mjs`), or a chunk it imports, holds a feature's code: one of the markers
// a feature names (its command, `get` and `is` keys, read from the built feature itself) or an
// import of a feature's entry point (`@fragiola/calendar…/selection`). Run by `pnpm build`, after
// the packages built. From Data Grid (fragiola/data-grid, scripts/check-features.ts, its string
// markers: where Data Grid and Tree drift, the calendar follows Data Grid), same author and
// licence. The core names every feature's keys in its `FEATURE_KEYS` table (Tree's, to refuse an
// uninstalled feature's names), so those names are no marker; a source of the feature's folder
// (`src/<subpath>/`) named by a built file's source map is one too (Tree's check).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chunksOf } from "./built-files.ts";

const root = join(import.meta.dirname, "..");

/** A feature's entry point (its subpath, in every package that has it) and its factory. */
export interface FeatureEntry {
    readonly subpath: string;
    readonly factory: string;
}

/**
 * The features, each exported by the core's built entry of its subpath. Empty until the first
 * feature lands (AGENTS.md D2: `selection`, `drag-and-drop`, `resize`, `recurrence`,
 * `now-indicator`, `constraints`, `external-drop`, `event-sources`).
 */
export const FEATURES: readonly FeatureEntry[] = [];

/** A feature as the guard reads it: its subpath and the markers its code holds. */
export interface FeatureMarkers {
    readonly subpath: string;
    readonly markers: readonly string[];
}

/**
 * What a built feature names: its commands, its `get` and `is` keys (a list of definitions or a
 * map), less the names the core owns in its table (`owned`: in the main entry by design).
 */
export function markersOf(
    feature: {
        readonly commands?: object;
        readonly queries?: object;
        readonly questions?: object;
        readonly get?: object;
        readonly is?: object;
    },
    owned: ReadonlySet<string> = new Set(),
): string[] {
    const commands = Array.isArray(feature.commands)
        ? feature.commands.map((command: { name: string }) => command.name)
        : Object.keys(feature.commands ?? {});
    return [
        ...commands,
        ...Object.keys(feature.queries ?? {}),
        ...Object.keys(feature.questions ?? {}),
        ...Object.keys(feature.get ?? {}),
        ...Object.keys(feature.is ?? {}),
    ].filter((marker) => !owned.has(marker));
}

/** The names the core's `FEATURE_KEYS` table lists: its commands, `get` and `is` keys. */
export function ownedNames(table: object): Set<string> {
    const names = new Set<string>();
    for (const keys of Object.values(table) as Record<string, string[]>[]) {
        for (const kind of [
            "commands",
            "get",
            "is",
            "engineRun",
            "engineGet",
            "engineIs",
        ]) {
            for (const name of keys[kind] ?? []) names.add(name);
        }
    }
    return names;
}

/** The sources a built file's source map names, as written there (`../src/selection/state.ts`). */
export function mapSources(map: string | undefined): string[] {
    if (map === undefined) return [];
    const parsed = JSON.parse(map) as { sources?: unknown };
    return Array.isArray(parsed.sources)
        ? parsed.sources.filter(
              (source): source is string => typeof source === "string",
          )
        : [];
}

/** Each feature's markers, from the core's build (`packages/core/dist/<subpath>.js`). */
async function builtMarkers(
    features: readonly FeatureEntry[],
): Promise<FeatureMarkers[]> {
    const core = (await import(
        pathToFileURL(join(root, "packages", "core", "dist", "index.js")).href
    )) as { FEATURE_KEYS?: object };
    const owned = ownedNames(core.FEATURE_KEYS ?? {});
    return Promise.all(
        features.map(async ({ subpath, factory }) => {
            const entry = join(
                root,
                "packages",
                "core",
                "dist",
                `${subpath}.js`,
            );
            const module = (await import(pathToFileURL(entry).href)) as Record<
                string,
                () => object
            >;
            const make = module[factory];
            if (typeof make !== "function") {
                throw new Error(`${entry} exports no ${factory}()`);
            }
            return { subpath, markers: markersOf(make(), owned) };
        }),
    );
}

/** An import of a feature's entry point, from any package: `@fragiola/<package>/<subpath>`. */
function importsSubpath(source: string, subpath: string): boolean {
    return new RegExp(
        `(?:from|import)\\s*\\(?\\s*["']@fragiola/[\\w-]+/${subpath}(?:/[^"']*)?["']`,
    ).test(source);
}

/**
 * The feature code a main entry holds, through the chunks it imports: one line per marker,
 * feature source or feature import found, with the file it is in. `read` gives a built file's
 * source by its name, relative to the entry's folder, and `readMap` its source map (`undefined`
 * for none).
 */
export function featureLeaks(
    main: string,
    read: (name: string) => string | undefined,
    features: readonly FeatureMarkers[],
    readMap: (name: string) => string | undefined = () => undefined,
): string[] {
    const leaks: string[] = [];
    const seen = new Set<string>();
    const visit = (name: string) => {
        if (seen.has(name)) return;
        seen.add(name);
        const source = read(name);
        if (source === undefined) return;
        const sources = mapSources(readMap(name)).map((path) =>
            path.replaceAll("\\", "/"),
        );
        for (const { subpath, markers } of features) {
            if (importsSubpath(source, subpath)) {
                leaks.push(`${name}: imports the ${subpath} entry`);
            }
            for (const path of sources) {
                if (path.includes(`src/${subpath}/`)) {
                    leaks.push(`${name}: ${subpath}'s ${path}`);
                }
            }
            for (const marker of markers) {
                if (
                    source.includes(`"${marker}"`) ||
                    source.includes(`'${marker}'`)
                ) {
                    leaks.push(`${name}: ${subpath}'s "${marker}"`);
                }
            }
        }
        for (const chunk of chunksOf(source)) visit(chunk);
    };
    visit(main);
    return leaks;
}

/** A package's main entry, relative to its `dist`: tsdown's or ng-packagr's. */
export function mainEntryOf(
    dist: string,
    packageName: string,
): string | undefined {
    if (existsSync(join(dist, "index.js"))) return "index.js";
    const fesm = `fesm2022/${packageName.replace(/^@/, "").replace("/", "-")}.mjs`;
    return existsSync(join(dist, fesm)) ? fesm : undefined;
}

async function main() {
    const features = await builtMarkers(FEATURES);
    const problems: string[] = [];
    for (const pkg of readdirSync(join(root, "packages"))) {
        const dir = join(root, "packages", pkg);
        const dist = join(dir, "dist");
        const name = (
            JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
                name: string;
            }
        ).name;
        const entry = existsSync(dist) ? mainEntryOf(dist, name) : undefined;
        if (!entry) {
            problems.push(`packages/${pkg}: no built main entry`);
            continue;
        }
        const folder = join(dist, entry.includes("/") ? "fesm2022" : "");
        const read = (file: string) => {
            const path = join(folder, file.replace(/^fesm2022\//, ""));
            return existsSync(path) ? readFileSync(path, "utf8") : undefined;
        };
        const readMap = (file: string) => read(`${file}.map`);
        for (const leak of featureLeaks(entry, read, features, readMap)) {
            problems.push(`packages/${pkg}/dist/${leak}`);
        }
    }
    if (problems.length > 0) {
        console.error(
            `A main entry ships a feature's code (a feature must stay in its own entry):\n${problems.join("\n")}`,
        );
        process.exit(1);
    }
    console.log(
        features.length === 0
            ? "check-features: no feature yet; every package has a built main entry"
            : `check-features: no package's main entry ships ${features.map((feature) => feature.subpath).join(", ")}`,
    );
}

// only when run, not when a test imports it
if (import.meta.main) {
    await main();
}
