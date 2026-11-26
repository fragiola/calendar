import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { THEMES } from "examples-shared/themes";
import { describe, expect, it } from "vitest";

// The React side of the theme contract: the embed's stylesheet brings the five shared themes after
// the Fragiola palettes (so a theme's palette rules win the tie), every --cal-* token an example's
// classes read is one every theme declares (a token no theme sets would resolve to nothing in
// silence), the examples never write a fixed colour (palette roles and theme tokens only), and the
// pre-paint script knows every theme. The values themselves are checked in examples/shared.

const APP = join(import.meta.dirname, "..");
const EXAMPLES = join(APP, "src", "examples");
const THEMES_DIR = join(APP, "..", "shared", "src", "themes");

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });
}

/** The --cal-* tokens a theme file declares. */
function declared(theme: string): Set<string> {
    const css = readFileSync(join(THEMES_DIR, `${theme}.css`), "utf-8");
    return new Set(
        [...css.matchAll(/--(cal-[a-z-]+):/g)].map(([, token]) => token ?? ""),
    );
}

const sources = walk(EXAMPLES).filter((file) => /\.(ts|tsx)$/.test(file));

describe("the examples' themes", () => {
    it("are imported by the embed's stylesheet after the palettes", () => {
        const css = readFileSync(
            join(APP, "src", "embed", "styles.css"),
            "utf-8",
        );
        const themes = css.indexOf(
            '@import "examples-shared/themes/index.css"',
        );
        expect(themes).toBeGreaterThan(-1);
        expect(themes).toBeGreaterThan(css.lastIndexOf("styles/palettes/"));
    });

    it("declare every --cal-* token the examples read, in every theme", () => {
        const used = new Set(
            sources.flatMap((file) =>
                [
                    ...readFileSync(file, "utf-8").matchAll(/--(cal-[a-z-]+)/g),
                ].map(([, token]) => token ?? ""),
            ),
        );
        expect(used.size).toBeGreaterThan(5);
        for (const theme of THEMES) {
            const tokens = declared(theme.name);
            expect(
                [...used].filter((token) => !tokens.has(token)),
                theme.name,
            ).toEqual([]);
        }
    });

    it("write no fixed colour: palette roles and theme tokens only", () => {
        const fixed =
            /\b(?:bg|text|border|ring|outline|fill|stroke|from|to|via)-(?:black|white|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})\b|#[0-9a-f]{3,8}\b|\brgb\(|\bhsl\(|\boklch\(/i;
        for (const file of sources) {
            const source = readFileSync(file, "utf-8");
            expect(
                fixed.exec(source)?.[0],
                relative(EXAMPLES, file),
            ).toBeUndefined();
        }
    });

    it("finds a fixed colour, written any way", () => {
        const fixed = /\bbg-blue-500\b|#fff\b/;
        expect(fixed.test('"bg-blue-500"')).toBe(true);
        expect(fixed.test('"#fff"')).toBe(true);
    });

    it("are each known to the pre-paint script, which reads their list", () => {
        const shared = readFileSync(join(APP, "vite.shared.ts"), "utf-8");
        expect(shared).toContain('from "examples-shared/themes"');
        expect(THEMES.map((theme) => theme.name)).toEqual([
            "light",
            "dark",
            "ide",
            "paper",
            "terminal",
        ]);
    });
});
