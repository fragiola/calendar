import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// The Fragiola UI theme (the palettes, the base stylesheet), `cn` and the class families
// (framework-neutral `tv` strings) are vendored into examples/react by its
// scripts/vendor-fragiola.ts; this app copies them (as examples/vue does), so the Angular kit
// (src/components, Fragiola UI's pieces as standalone directives and components) wears the React
// kit's classes. A copy is the original with its first line
// (the vendoring header) replaced.

const here = join(import.meta.dirname, "..");
const react = join(here, "..", "react");

function listFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? listFiles(path) : [path];
    });
}

const FAMILIES = [
    "calendar",
    "choice",
    "field",
    "foundation",
    "layer",
    "menu",
    "popup",
];

const COPIES = [
    ...listFiles(join(here, "src/styles")),
    join(here, "src/lib/cn.ts"),
    ...FAMILIES.map((name) => join(here, `src/components/families/${name}.ts`)),
];

/** The original of a copy: the same path, but `field` and `calendar` are `.tsx` there (no JSX). */
const originalOf = (file: string) =>
    /families\/(field|calendar)\.ts$/.test(file) ? `${file}x` : file;

/**
 * Each Angular kit piece, its React original and the class strings (or family calls) it must wear as
 * React's does: compared with the whitespace collapsed, so a multi-line class template matches.
 */
const KIT: [angular: string, react: string, classes: string[]][] = [
    [
        "atoms/clickable.ts",
        "atoms/clickable/index.tsx",
        [
            "foundation.focus()",
            "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium transition-colors duration-150 [&_svg:not([class*='size-'])]:size-icon",
            'solid: "bg-palette-base text-palette-contrast hover:bg-palette-base-hover"',
            'ghost: ["bg-transparent text-palette-accent", foundation.hover()]',
            "outline: [foundation.box(), foundation.hover()]",
            'md: "h-control px-4"',
            'square: "px-0 aspect-square"',
            "pointer-events-none opacity-50 **:pointer-events-none",
        ],
    ],
    [
        "atoms/text.ts",
        "atoms/text/index.tsx",
        [
            "font-semibold text-palette-contrast",
            "text-palette-contrast text-sm transition-all",
            "text-palette-contrast text-sm font-medium block",
            "palette-danger text-xs text-palette-accent",
        ],
    ],
    ["atoms/fields.ts", "atoms/fields/input.tsx", ["field.control()"]],
    [
        "families/layer/parts.ts",
        "families/layer/parts.tsx",
        [
            "layer.backdrop()",
            "layer.panel()",
            "duration-200 data-starting-style:scale-95 data-ending-style:scale-95",
            "absolute top-4 end-4",
            "layer.header()",
            "layer.body()",
            "layer.footer()",
            "layer.title()",
            "layer.description()",
        ],
    ],
    [
        "ui/dialog.ts",
        "ui/dialog.tsx",
        [
            "fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4",
            "relative w-full max-w-lg",
        ],
    ],
    [
        "ui/field.ts",
        "ui/field.tsx",
        [
            "field.root()",
            "field.choiceRoot()",
            "field.label()",
            "field.row()",
            "field.body()",
            "field.description()",
            "field.error()",
        ],
    ],
    [
        "ui/popover.ts",
        "ui/popover.tsx",
        ['popup.content("z-50 outline-none")', "absolute top-4 end-4"],
    ],
    [
        "ui/select.ts",
        "ui/select.tsx",
        [
            "field.row()",
            "flex-row items-center justify-between px-3 py-2",
            "text-sm text-palette-accent/85",
            "size-icon text-palette-accent/85",
            'popup.content("z-50 outline-none")',
            "menu.selectableItem()",
            "menu.itemIndicator()",
        ],
    ],
    [
        "ui/checkbox.ts",
        "ui/checkbox.tsx",
        [
            "choice.mark()",
            "choice.indicator()",
            "size-icon-xs in-data-indeterminate:hidden",
            "hidden size-icon-xs in-data-indeterminate:block",
        ],
    ],
    [
        "ui/segmented-control.ts",
        "ui/segmented-control.tsx",
        [
            "rounded-[max(0px,calc(var(--radius-control)-2px))]",
            "relative isolate inline-flex min-h-control w-fit items-stretch gap-0.5 rounded-control p-0.5 data-[orientation=vertical]:flex-col",
            "absolute -z-10 inset-s-(--segment-indicator-inset-inline-start) top-(--segment-indicator-inset-block-start) w-(--segment-indicator-inline-size) h-(--segment-indicator-block-size) transition-[inset-inline-start,top,width,height] duration-200 ease-out motion-reduce:transition-none",
            "current:bg-transparent inline-flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap px-3 text-sm text-palette-accent/85 select-none transition-colors duration-150 [&_svg:not([class*='size-'])]:size-icon",
        ],
    ],
    [
        "ui/calendar.ts",
        "ui/calendar.tsx",
        [
            "calendar.root()",
            "calendar.months()",
            "calendar.month()",
            "calendar.header()",
            "calendar.heading()",
            "calendar.grid()",
            "calendar.headerCell()",
            "calendar.cell()",
            "calendar.item()",
            'clickable({ variant: "icon", shape: "square", size: "sm" })',
            "rtl:rotate-180",
            "inert || checked ? undefined : foundation.hover()",
        ],
    ],
];

const body = (source: string) => source.slice(source.indexOf("\n") + 1);

describe("the files copied from examples/react", () => {
    it.each(COPIES.map((file) => relative(here, file)))("%s", (file) => {
        const copy = readFileSync(join(here, file), "utf8");
        const original = readFileSync(join(react, originalOf(file)), "utf8");
        expect(copy.split("\n")[0]).toContain(
            `Copied from examples/react/${originalOf(file)}`,
        );
        expect(body(copy)).toBe(body(original));
    });

    it("cover every palette examples/react vendors", () => {
        const names = (dir: string) => readdirSync(dir).sort();
        expect(names(join(here, "src/styles/palettes"))).toEqual(
            names(join(react, "src/styles/palettes")),
        );
    });
});

/** The roots that render no element: a directive on an `ng-template` or an `ng-container` (Fragiola Primitives' render none either). */
const ROOTLESS = ["dialog", "popover", "select"];

describe("the Angular kit", () => {
    const flat = (source: string) => source.replace(/\s+/g, " ");
    const read = (root: string, file: string) =>
        flat(readFileSync(join(root, "src/components", file), "utf8"));

    it.each(KIT)(
        "%s wears the classes of React's %s",
        (angular, original, wanted) => {
            const mine = read(here, angular);
            const theirs = read(react, original);
            for (const name of wanted) {
                expect(theirs, `${original}: ${name}`).toContain(name);
                expect(mine, `${angular}: ${name}`).toContain(name);
            }
        },
    );

    it("keeps the React kit's data-slot names", () => {
        for (const [angular, original] of KIT) {
            const mine = read(here, angular);
            const theirs = read(react, original).matchAll(
                /data-slot="([a-z-]+)"/g,
            );
            for (const [, name] of theirs) {
                // a root with no element of its own carries none
                if (name && ROOTLESS.includes(name)) continue;
                expect(mine, `${angular}: data-slot ${name}`).toContain(
                    `"${name}"`,
                );
            }
        }
    });
});
