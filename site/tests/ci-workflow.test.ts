import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

/** The apps whose Playwright version the E2E image follows (Vue's and Angular's join with them). */
const PLAYWRIGHT_APPS = [
    "apps/playground",
    "examples/shared",
    "examples/react",
    "examples/vue",
    "examples/angular",
];

/** The `@playwright/test` versions the existing apps pin. */
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

// The E2E jobs run in Playwright's image instead of installing the browsers: its browsers are the
// ones of its version, so the tag follows @playwright/test.
describe("the CI workflow", () => {
    it("runs the playground's and the examples' E2E jobs in Playwright's image, as user 1001", () => {
        const workflow = read(".github/workflows/ci.yml");
        for (const job of ["e2e-playground", "e2e-examples"]) {
            const body =
                new RegExp(`\\n  ${job}:\\n((?:    .*\\n|\\n)+)`).exec(workflow)?.[1] ?? "";
            expect(body, job).toMatch(
                /container:\n\s+image: mcr\.microsoft\.com\/playwright:v[\d.]+-noble\n\s+options: --user 1001/,
            );
            expect(body, job).toContain("needs: changes");
        }
        expect(playwrightVersions()).toEqual(new Set(["1.65.1"]));
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

    it("runs on pull requests and manual runs, never on a push to main yet", () => {
        const workflow = read(".github/workflows/ci.yml");
        const on = /^on:\n((?:\s+.*\n)+?)\n/m.exec(workflow)?.[1] ?? "";
        expect(on).toContain("pull_request:");
        expect(on).toContain("workflow_dispatch:");
        expect(on).not.toContain("push:");
    });
});
