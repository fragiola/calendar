import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

/** The apps whose Playwright version the E2E image follows: every one with a Playwright suite. */
const PLAYWRIGHT_APPS = [
    "apps/playground",
    "examples/shared",
    "examples/react",
    "examples/vue",
    "examples/angular",
];

/** The `@playwright/test` versions the apps pin (an app that does not exist pins none). */
function playwrightVersions(): Set<string> {
    return new Set(
        PLAYWRIGHT_APPS.filter((dir) =>
            existsSync(join(root, dir, "package.json")),
        )
            .map(
                (dir) =>
                    (
                        JSON.parse(read(`${dir}/package.json`)) as {
                            devDependencies?: Record<string, string>;
                        }
                    ).devDependencies?.["@playwright/test"],
            )
            .filter((version): version is string => version !== undefined),
    );
}

/**
 * What is wrong with a workflow (guidelines repository.md#ci): a browser install, or a Playwright
 * image whose tag is not the version the apps pin. A workflow without Playwright jobs is fine.
 */
function workflowProblems(
    workflow: string,
    versions: ReadonlySet<string>,
): string[] {
    const problems: string[] = [];
    if (workflow.includes("playwright install")) {
        problems.push("installs Playwright's browsers (`playwright install`)");
    }
    const images = [
        ...workflow.matchAll(
            /mcr\.microsoft\.com\/playwright:v([\d.]+)-noble/g,
        ),
    ].map((match) => match[1] ?? "");
    for (const tag of new Set(images)) {
        if (!versions.has(tag)) {
            problems.push(`runs Playwright's image v${tag}, which no app pins`);
        }
    }
    if (images.length > 0 && versions.size !== 1) {
        problems.push(
            `the apps pin ${versions.size} Playwright versions, not one`,
        );
    }
    return problems;
}

// `triggers` and `jobs` from Flow (fragiola/flow, site/tests/ci-workflow.test.ts), same author and
// licence: a push to main runs the www trigger only, every other job skips it.

/** The workflow's top-level `on:` events. */
function triggers(source: string): string[] {
    const block = /^on:\n((?:[ \t]+.*\n|\n)*)/m.exec(source)?.[1] ?? "";
    return [...block.matchAll(/^ {2}([a-z_]+):/gm)].flatMap((match) =>
        match[1] === undefined ? [] : [match[1]],
    );
}

/** The workflow's jobs, by id, in order: each one's `if` (when it has one) and its `needs`. */
function jobs(
    source: string,
): Record<string, { if?: string; needs: string[] }> {
    const block = source.slice(source.search(/^jobs:\n/m));
    const found: Record<string, { if?: string; needs: string[] }> = {};
    for (const match of block.matchAll(
        /^ {2}([\w-]+):\n((?:(?: {4,}.*)?\n)*)/gm,
    )) {
        const [, id = "", body = ""] = match;
        const condition = /^ {4}if: (.+)$/m.exec(body)?.[1];
        const needs = /^ {4}needs: (.+)$/m.exec(body)?.[1] ?? "";
        found[id] = {
            ...(condition === undefined ? {} : { if: condition.trim() }),
            needs: needs
                .replace(/[[\]]/g, "")
                .split(",")
                .map((need) => need.trim())
                .filter((need) => need !== ""),
        };
    }
    return found;
}

/** Whether a job condition skips a push: `!= 'push'`, or pull requests only (Changesets). */
function skips(condition: string | undefined): boolean {
    return (
        condition === "github.event_name != 'push'" ||
        condition?.startsWith("github.event_name == 'pull_request' &&") === true
    );
}

// The E2E jobs run in Playwright's image instead of installing the browsers: its browsers are the
// ones of its version, so the tag follows @playwright/test.
describe("the CI workflow", () => {
    it("runs the playground's and the examples' E2E jobs in Playwright's image, as user 1001", () => {
        const workflow = read(".github/workflows/ci.yml");
        for (const job of ["e2e-playground", "e2e-examples"]) {
            const body =
                new RegExp(`\\n  ${job}:\\n((?:    .*\\n|\\n)+)`).exec(
                    workflow,
                )?.[1] ?? "";
            expect(body, job).toMatch(
                /container:\n\s+image: mcr\.microsoft\.com\/playwright:v[\d.]+-noble\n\s+options: --user 1001/,
            );
            expect(body, job).toContain("needs: changes");
        }
        expect(playwrightVersions()).toEqual(new Set(["1.65.1"]));
    });

    it("sees every app's Playwright pin, examples/angular's included", () => {
        for (const dir of PLAYWRIGHT_APPS) {
            const manifest = JSON.parse(read(`${dir}/package.json`)) as {
                devDependencies?: Record<string, string>;
            };
            expect(manifest.devDependencies?.["@playwright/test"], dir).toBe(
                "1.65.1",
            );
        }
    });

    it("installs no browser, and any Playwright image is the apps' version", () => {
        expect(
            workflowProblems(
                read(".github/workflows/ci.yml"),
                playwrightVersions(),
            ),
        ).toEqual([]);
    });

    it("accepts a workflow without Playwright jobs", () => {
        expect(
            workflowProblems("jobs:\n  checks:\n    steps: []\n", new Set()),
        ).toEqual([]);
    });

    it("fails on `playwright install`", () => {
        expect(
            workflowProblems(
                "      - run: pnpm exec playwright install --with-deps chromium\n",
                new Set(),
            ),
        ).toEqual(["installs Playwright's browsers (`playwright install`)"]);
    });

    it("fails on an image whose tag no app pins", () => {
        const workflow =
            "    container:\n      image: mcr.microsoft.com/playwright:v1.60.0-noble\n";
        expect(workflowProblems(workflow, new Set(["1.65.1"]))).toEqual([
            "runs Playwright's image v1.60.0, which no app pins",
        ]);
        expect(workflowProblems(workflow, new Set(["1.60.0"]))).toEqual([]);
    });

    it("runs on pull requests, manual runs and pushes to main", () => {
        const workflow = read(".github/workflows/ci.yml");
        expect(triggers(workflow)).toEqual([
            "pull_request",
            "push",
            "workflow_dispatch",
        ]);
        expect(workflow).toMatch(/^ {2}push:\n {4}branches: \[main\]\n/m);
        expect(
            triggers(
                "on:\n  pull_request:\n  push:\n    branches: [main]\n\njobs:\n",
            ),
        ).toEqual(["pull_request", "push"]);
    });

    it("runs only the www trigger on a push to main: no tests", () => {
        const all = jobs(read(".github/workflows/ci.yml"));
        expect(Object.keys(all)).toEqual([
            "checks",
            "package",
            "changesets",
            "changes",
            "e2e-playground",
            "e2e-examples",
            "site-export",
            "trigger-www-build",
        ]);
        for (const [id, job] of Object.entries(all)) {
            if (id === "trigger-www-build") {
                expect(job.if).toBe(
                    "github.event_name == 'push' && github.ref == 'refs/heads/main'",
                );
                continue;
            }
            // skipped on a push itself, or needs a job that is (a skipped need skips it)
            const skipsPush = skips(job.if);
            const needsOne = job.needs.some((need) => skips(all[need]?.if));
            expect(skipsPush || needsOne, `${id} runs on a push`).toBe(true);
            // a skipped need skips a job only while its condition does not override it
            if (!skipsPush) {
                expect(job.if ?? "", id).not.toMatch(
                    /always\(\)|cancelled\(\)|failure\(\)/,
                );
            }
        }
        // a pull request runs every other job as before: nothing but the trigger skips it
        for (const [id, job] of Object.entries(all)) {
            if (id === "trigger-www-build") continue;
            expect(job.if ?? "", id).not.toContain("== 'push'");
        }
        // a job condition is one line: a block scalar would hide it from the check
        expect(read(".github/workflows/ci.yml")).not.toMatch(/^ {4}if: [>|]/m);
        expect(
            jobs(
                "jobs:\n  a:\n    if: x\n    needs: b\n    steps:\n  b:\n    needs: [a, c]\n",
            ),
        ).toEqual({ a: { if: "x", needs: ["b"] }, b: { needs: ["a", "c"] } });
        expect(skips("github.event_name != 'push'")).toBe(true);
        expect(skips("github.event_name == 'pull_request' && x")).toBe(true);
        expect(skips("needs.changes.outputs.playground == 'true'")).toBe(false);
        expect(skips(undefined)).toBe(false);
    });

    it("exports the site the way www builds it, and dispatches project-updated to www", () => {
        const workflow = read(".github/workflows/ci.yml");
        const job =
            /\n {2}site-export:\n((?: {4}.*\n|\n)+)/.exec(
                `${workflow}\n`,
            )?.[1] ?? "";
        expect(job).toContain("name: Site export");
        expect(job).toContain(
            'pnpm site:export --base /calendar --out "$RUNNER_TEMP/site-export"',
        );
        const trigger = workflow.slice(
            workflow.indexOf("\n  trigger-www-build:"),
        );
        expect(trigger).toContain("name: Trigger www build");
        expect(trigger).toContain("repos/fragiola/www/dispatches");
        expect(trigger).toContain("event_type=project-updated");
        expect(trigger).toContain("client_payload[slug]=calendar");
        expect(trigger).toContain("client_payload[sha]=$GITHUB_SHA");
        // skipped, not failed, without the secret
        expect(trigger).toMatch(
            /WWW_DISPATCH_TOKEN: \$\{\{ secrets\.WWW_DISPATCH_TOKEN \}\}/,
        );
        expect(trigger).toContain("if: env.WWW_DISPATCH_TOKEN != ''");
        expect(trigger).toContain("GH_TOKEN: ${{ env.WWW_DISPATCH_TOKEN }}");
    });
});
