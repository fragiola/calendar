import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
    changedPaths,
    e2eSuites,
    examplesFrameworks,
    needOf,
} from "../../scripts/e2e-suites.ts";

// the examples apps the calendar will have (React, Vue and Angular Epics); none exist yet
const EXAMPLES = ["angular", "react", "vue"];
const ALL = { playground: true, examples: EXAMPLES };
const NONE = { playground: false, examples: [] };

// CI's `changes` job runs scripts/e2e-suites.ts against the pull request's base.
describe("the E2E suites a change runs", () => {
    it("runs none for docs only", () => {
        expect(
            e2eSuites(
                [
                    "site/docs/guides/recurrence.mdx",
                    "AGENTS.md",
                    "README.md",
                    "docs/survey.md",
                    "packages/core/README.md",
                ],
                EXAMPLES,
            ),
        ).toEqual(NONE);
    });

    it("runs the playground and React's examples for React", () => {
        expect(
            e2eSuites(
                [
                    "packages/react/src/components/day-grid.tsx",
                    "examples/react/src/examples/basic/index.tsx",
                ],
                EXAMPLES,
            ),
        ).toEqual({ playground: true, examples: ["react"] });
    });

    it("runs only an adapter's examples for Vue or Angular", () => {
        expect(e2eSuites(["packages/vue/src/index.ts"], EXAMPLES)).toEqual({
            playground: false,
            examples: ["vue"],
        });
        expect(
            e2eSuites(
                [
                    "packages/vue/src/index.ts",
                    "examples/angular/src/examples/basic/index.ts",
                ],
                EXAMPLES,
            ),
        ).toEqual({ playground: false, examples: ["angular", "vue"] });
    });

    it("runs every suite for an unknown path, or anything else that is not known to be safe", () => {
        for (const path of [
            "packages/core/src/time-zone/offset.ts",
            "examples/shared/e2e/month.spec.ts",
            "apps/playground/src/app.tsx",
            "pnpm-lock.yaml",
            "package.json",
            "biome.json",
            ".github/workflows/ci.yml",
            "scripts/e2e-suites.ts",
            "site/export.ts",
            "packages/svelte/src/index.ts",
            "some/new/folder/file.txt",
        ]) {
            expect(needOf(path), path).toBe("all");
            expect(
                e2eSuites(["packages/vue/src/index.ts", path], EXAMPLES),
                path,
            ).toEqual(ALL);
        }
    });

    it("runs none for no change", () => {
        expect(e2eSuites([], EXAMPLES)).toEqual(NONE);
    });

    it("finds the examples apps with a Playwright config, and none in a missing folder", () => {
        expect(examplesFrameworks()).toEqual(["react"]);
        expect(examplesFrameworks(join(tmpdir(), "no-such-examples"))).toEqual(
            [],
        );
    });
});

describe("the changed paths of a diff", () => {
    let repo: string | undefined;
    afterEach(() => {
        if (repo) rmSync(repo, { recursive: true, force: true });
        repo = undefined;
    });

    const git = (cwd: string, ...args: string[]) =>
        execFileSync(
            "git",
            [
                "-c",
                "user.name=test",
                "-c",
                "user.email=test@example.com",
                "-c",
                "commit.gpgsign=false",
                ...args,
            ],
            { cwd, encoding: "utf8" },
        );

    it("lists a renamed file under both its paths (`--no-renames`)", () => {
        const dir = mkdtempSync(join(tmpdir(), "calendar-e2e-suites-"));
        repo = dir;
        git(dir, "init", "--quiet");
        mkdirSync(join(dir, "packages/core/src/layout"), { recursive: true });
        writeFileSync(
            join(dir, "packages/core/src/layout/day-grid.ts"),
            "export const lanes = 1;\n".repeat(20),
        );
        git(dir, "add", ".");
        git(dir, "commit", "--quiet", "-m", "first");
        mkdirSync(join(dir, "packages/react/src/utils"), { recursive: true });
        git(
            dir,
            "mv",
            "packages/core/src/layout/day-grid.ts",
            "packages/react/src/utils/day-grid.ts",
        );
        git(dir, "commit", "--quiet", "-m", "move");

        const paths = changedPaths("HEAD^1", dir);
        expect(paths.sort()).toEqual([
            "packages/core/src/layout/day-grid.ts",
            "packages/react/src/utils/day-grid.ts",
        ]);
        // the old path is the core's: the move runs every suite, not React's only
        expect(e2eSuites(paths, EXAMPLES)).toEqual(ALL);
    });
});
