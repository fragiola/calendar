// From Primitives (fragiola/primitives, site/tests/contract.test.ts), same author and licence
// (itself from Tree's).
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
    CATEGORIES,
    CATEGORY_TITLES,
} from "../../examples/shared/src/meta-types.ts";
import { THEMES } from "../../examples/shared/src/themes/themes.ts";
import {
    CONTRACT_VERSION,
    contractVersion,
    contractVersionOf,
    contractVersionProblem,
    findWwwContract,
    frontmatter,
    LIMITS,
    type Site,
    validateSite,
} from "../contract.ts";
import { baseProblem, readExamplesSource, readSite } from "../sources.ts";

// The export is checked in memory against the site export contract (fragiola/www CONTRACT.md,
// v1.7) as www checks it, and against what this project decided for its own pages
// (guidelines docs/site.md: Dockable's information architecture, and the landing's rules).

let site: Site;
beforeAll(async () => {
    site = await readSite();
});

/** The site with one page replaced (or added). */
const withPage = (path: string, source: string): Site => ({
    ...site,
    pages: new Map([...site.pages, [path, source]]),
});

const PAGE = (body: string) =>
    `---\ntitle: A page\ndescription: A page that exists only in this test, long enough to be a valid description.\n---\n\n${body}\n`;

describe("the site export", () => {
    it("implements contract v1.7", () => {
        expect(CONTRACT_VERSION).toBe("1.7");
    });

    it("reads the contract version from www's CONTRACT.md, the pinned one where www is absent", () => {
        const root = mkdtempSync(join(tmpdir(), "calendar-contract-"));
        const repo = join(root, "calendar", ".worktrees", "epic");
        mkdirSync(repo, { recursive: true });
        // CI: no www checked out beside the repository
        expect(findWwwContract(repo)).toBeUndefined();
        expect(contractVersion(findWwwContract(repo))).toEqual({
            version: CONTRACT_VERSION,
            source: "pinned",
        });
        // a checkout: www beside an ancestor of the worktree
        mkdirSync(join(root, "www"));
        const file = join(root, "www", "CONTRACT.md");
        writeFileSync(file, "# Site export contract, v1.7\n\nText.\n");
        expect(findWwwContract(repo)).toBe(file);
        const same = contractVersion(file);
        expect(same).toEqual({ version: "1.7", source: "www" });
        expect(contractVersionProblem(same)).toBeUndefined();
        // www moved on: the export says so instead of exporting against an old contract
        writeFileSync(file, "# Site export contract, v1.8\n");
        expect(contractVersionProblem(contractVersion(file))).toMatch(
            /v1\.8, this export implements v1\.7/,
        );
        writeFileSync(file, "# Something else\n");
        expect(() => contractVersion(file)).toThrow(/no "# Site export/);
        expect(contractVersionOf("## Site export contract, v1.7")).toBe(
            undefined,
        );
    });

    it("matches www's CONTRACT.md when it is checked out", () => {
        const version = contractVersion(findWwwContract());
        if (version.source === "www") {
            expect(contractVersionProblem(version)).toBeUndefined();
        } else {
            expect(version.version).toBe(CONTRACT_VERSION);
        }
    });

    it("refuses a base other than the project's", () => {
        expect(baseProblem("/calendar", "calendar")).toBeUndefined();
        expect(baseProblem("/docs", "calendar")).toMatch(
            /under \/calendar only/,
        );
        expect(baseProblem("", "calendar")).toMatch(/--base \//);
        expect(baseProblem("/calendar/x", "calendar")).toBeDefined();
    });

    it("passes its own validation", () => {
        expect(validateSite(site)).toEqual([]);
    });

    it("fails on what www rejects", () => {
        const cases: [string, RegExp][] = [
            ["See [x](/docs/nope).", /no page \/docs\/nope/],
            ["See [x](/ai/docs/mcp).", /nothing below it/],
            ["See [x](../api/weeks.mdx).", /relative link/],
            ["See [x](/examples/nope).", /no example "nope"/],
            ["# A heading", /#/],
            ['<Example id="nope" />', /is not an example/],
            ['<Hero title="x" />', /landing only/],
            ['<InstallCommand item="calendar" />', /is not in r\//],
            ["<Unknown />", /not in the v1.1 vocabulary/],
        ];
        for (const [body, problem] of cases) {
            const problems = validateSite(withPage("api/weeks", PAGE(body)));
            expect(problems.join("\n"), body).toMatch(problem);
        }
    });

    it("accepts the reserved /ai link, with an anchor", () => {
        const problems = validateSite(
            withPage(
                "api/weeks",
                PAGE(
                    "## Agents\n\nSee [the agent](/ai) and [its setup](/ai#set-it-up).",
                ),
            ),
        );
        expect(problems).toEqual([]);
    });
});

describe("project.json", () => {
    it("declares the project", () => {
        const { project } = site;
        expect(project).toMatchObject({
            contract: 1,
            slug: "calendar",
            title: "Calendar",
            frameworks: ["react", "vue", "angular"],
            defaultFramework: "react",
            repository: "https://github.com/fragiola/calendar",
        });
        const length = [...project.description].length;
        expect(length).toBeGreaterThanOrEqual(LIMITS.description.min);
        expect(length).toBeLessThanOrEqual(LIMITS.description.max);
        expect(project.keywords?.length).toBeGreaterThanOrEqual(1);
        expect(project.keywords?.length).toBeLessThanOrEqual(8);
        for (const keyword of project.keywords ?? []) {
            expect(keyword).toBe(keyword.toLowerCase());
        }
        // nothing this project does not ship
        expect(project.registry).toBeUndefined();
        expect("create" in project).toBe(false);
    });
});

describe("examples.json", () => {
    it("lists the categories of examples/shared as its levels", () => {
        expect(readExamplesSource().levels).toEqual(
            CATEGORIES.map((id) => ({ id, title: CATEGORY_TITLES[id] })),
        );
    });

    it("offers the five themes, in order, with their CSS", () => {
        expect(readExamplesSource().themes).toEqual([
            "light",
            "dark",
            "ide",
            "paper",
            "terminal",
        ]);
        expect(site.examples.themes.map((theme) => theme.name)).toEqual(
            THEMES.map((theme) => theme.name),
        );
        for (const theme of site.examples.themes) {
            expect(theme.file?.path).toBe(`_themes/${theme.name}.css`);
            expect(theme.file?.content).toContain(
                `[data-example-theme="${theme.name}"]`,
            );
        }
    });
});

describe("the landing", () => {
    const landing = () => site.pages.get("index") ?? "";
    const body = () => landing().replace(/^---[\s\S]*?\n---\n/, "");

    it("is titled after the project, in at most 60 characters", () => {
        const fields = frontmatter(landing());
        expect(fields.layout).toBe("landing");
        expect(fields.title?.startsWith("Calendar — ")).toBe(true);
        expect([...(fields.title ?? "")].length).toBeLessThanOrEqual(60);
    });

    it("has one Hero whose actions go examples, the agent (/ai), then the docs", () => {
        expect(body().match(/<Hero\b/g)).toHaveLength(1);
        const hrefs = [
            ...(/<Hero[\s\S]*?\/>/.exec(body())?.[0] ?? "").matchAll(
                /href: "([^"]+)"/g,
            ),
        ].map((match) => match[1]);
        // no GitHub action: the site's header and footer link it (Tree's landing, #80)
        expect(hrefs).toHaveLength(3);
        expect(hrefs[0]).toBe("/examples");
        expect(hrefs[1]).toBe("/ai");
        expect(hrefs[2]).toMatch(/^\/docs\//);
        expect(body()).not.toMatch(/<Hero[\s\S]*?github\.com[\s\S]*?\/>/);
        expect(body()).toContain('{ label: "Set up your agent", href: "/ai"');
    });

    it("shows a top-level showcase example right after the Hero", () => {
        const afterHero =
            body()
                .split(/<Hero[\s\S]*?\/>/)[1]
                ?.trimStart() ?? "";
        expect(afterHero).toMatch(/^<Example\b[^>]*variant="showcase"/);
    });
});

describe("the sidebar", () => {
    it("follows Dockable's IA (guidelines docs/site.md)", () => {
        expect(site.config.sections.map((section) => section.label)).toEqual([
            "Getting started",
            "Concepts",
            "Guides",
            "API: primitives (@fragiola/calendar-react)",
            "API: core (@fragiola/calendar)",
            "More",
        ]);
        const more = site.config.sections.at(-1)?.pages ?? [];
        expect(more).toEqual([
            {
                label: "Found a problem?",
                href: "https://github.com/fragiola/calendar/issues",
                external: true,
            },
        ]);
    });

    it("lists the Epic's pages", () => {
        const paths = new Set(
            site.config.sections.flatMap((section) =>
                section.pages.flatMap((entry) =>
                    "path" in entry ? [entry.path] : [],
                ),
            ),
        );
        for (const path of [
            "getting-started/introduction",
            "getting-started/installation",
            "getting-started/first-calendar",
            "getting-started/sizing",
            "getting-started/accessible-names",
            "concepts/model-and-commands",
            "concepts/model-and-engine",
            "concepts/features",
            "concepts/composition",
            "concepts/primitive-contract",
            "concepts/state-attributes",
            "concepts/typed-data",
            "concepts/dates-and-time-zones",
            "concepts/views-and-ranges",
            "concepts/layout",
            "concepts/occurrences-and-recurrence",
            "guides/month-view",
            "guides/week-and-day-views",
            "guides/list-view",
            "guides/selecting-ranges",
            "guides/drag-and-drop",
            "guides/resizing",
            "guides/external-drop",
            "guides/recurring-events",
            "guides/constraints-and-business-hours",
            "guides/loading-events",
            "guides/time-zones",
            "guides/locales-and-week-numbers",
            "guides/rtl",
            "guides/keyboard",
            "guides/styling-css",
            "guides/styling-tailwind",
            "guides/theming",
            "guides/persistence",
            "guides/undo-redo",
            "guides/testing",
            "guides/ai-and-automation",
            "api/hooks",
            "api/model",
            "api/command-bus",
            "api/commands",
            "api/json-document",
            "api/settings",
            "api/engine",
            "api/features",
            "api/date-helpers",
        ]) {
            expect(paths.has(path), path).toBe(true);
        }
    });

    it("says the D1 alias on the installation page", () => {
        const page = site.pages.get("getting-started/installation") ?? "";
        expect(page).toContain("pnpm add @fragiola/calendar-react");
        expect(page).toContain("@fragiola/primitives-react");
    });

    it("lists no gap, limitation or missing feature on a public page", () => {
        for (const [path, source] of site.pages) {
            expect(source, path).not.toMatch(
                /\b(not (yet )?(implemented|supported)|known (limits|limitations|gaps)|limitations|coming soon|TODO)\b/i,
            );
        }
    });
});
