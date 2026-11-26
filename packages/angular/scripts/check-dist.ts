// From Flow (fragiola/flow, packages/angular/scripts/check-dist.ts, Data Grid's), same author and
// licence. After `ng-packagr` built `dist`: the package is packed from its own folder
// (`files: ["dist"]`, the published exports in `publishConfig.exports`, as every package of the
// repo), so the manifests ng-packagr writes into `dist` (the entry's, its secondary entries' and
// its `.npmignore`) are not the published ones, and its copies of the README and the licence
// would be packed twice. They go, and the bundles are checked: they import nothing at run time but
// Angular, the core (and its features' entries) and the package itself (ng-packagr would list
// `tslib`, which the partial compilation output never imports: ES2022 classes, no decorators).
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const dist = join(import.meta.dirname, "..", "dist");

/** The bare specifiers a bundle imports. */
export function importsOf(source: string): string[] {
    return [
        ...source.matchAll(/(?:from\s*|import\s*\(\s*)["']([^"'.][^"']*)["']/g),
    ].map(([, specifier]) => specifier ?? "");
}

/** The secondary entries: the shared `internal` one, and each core feature subpath mirrored. */
export const ENTRIES = [
    "internal",
    "selection",
    "drag-and-drop",
    "resize",
    "external-drop",
    "now-indicator",
    "constraints",
    "recurrence",
    "event-sources",
];

const FEATURES = ENTRIES.filter((entry) => entry !== "internal");

const ALLOWED = new RegExp(
    `^(@angular/core|@fragiola/calendar(/(${FEATURES.join("|")}))?|@fragiola/calendar-angular(/(${ENTRIES.join("|")}))?)$`,
);

function main() {
    for (const file of [
        "package.json",
        ".npmignore",
        // the package's own, packed from its folder: not twice
        "README.md",
        "LICENSE",
    ]) {
        rmSync(join(dist, file), { force: true });
    }
    for (const folder of ENTRIES) {
        rmSync(join(dist, folder), { recursive: true, force: true });
    }
    const folder = join(dist, "fesm2022");
    for (const name of readdirSync(folder).filter((file) =>
        file.endsWith(".mjs"),
    )) {
        for (const specifier of importsOf(
            readFileSync(join(folder, name), "utf8"),
        )) {
            if (!ALLOWED.test(specifier)) {
                throw new Error(`dist/fesm2022/${name} imports ${specifier}`);
            }
        }
    }
    console.log(
        "check-dist: the manifests of dist removed, the bundles' imports checked",
    );
}

if (import.meta.main) {
    main();
}
