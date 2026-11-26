import { describe, expect, it } from "vitest";
import {
    ADAPTERS,
    corePinProblem,
    exportProblems,
    publishedExportsProblems,
    unlistedPackages,
} from "../../scripts/check-package.ts";

// `pnpm check:package` packs every package and checks what would be published.
describe("the package check", () => {
    it("has no adapter yet, and fails a package that is neither the core nor listed", () => {
        expect(ADAPTERS).toEqual([]);
        expect(unlistedPackages(["core"])).toEqual([]);
        expect(unlistedPackages(["core", "react"])).toEqual(["react"]);
    });

    it("refuses a published source condition or a target outside dist", () => {
        expect(
            exportProblems({
                ".": {
                    "@fragiola/source": "./src/index.ts",
                    types: "./dist/index.d.ts",
                },
            }),
        ).toEqual([
            'exports["."]: the "@fragiola/source" condition is published',
            'exports["."]["@fragiola/source"]: "./src/index.ts" is not in dist',
        ]);
    });

    it("wants the published exports to be the repo's without the source condition", () => {
        const exports = {
            ".": {
                "@fragiola/source": "./src/index.ts",
                types: "./dist/index.d.ts",
                default: "./dist/index.js",
            },
        };
        expect(
            publishedExportsProblems(exports, {
                ".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
            }),
        ).toEqual([]);
        expect(
            publishedExportsProblems(exports, {
                ".": { default: "./dist/index.js" },
            }),
        ).toHaveLength(1);
    });

    it("wants an adapter to pin the core's exact version", () => {
        const adapter = (version: string) => ({
            name: "@fragiola/calendar-react",
            dependencies: { "@fragiola/calendar": version },
        });
        expect(corePinProblem(adapter("0.1.0"), "0.1.0")).toBeUndefined();
        expect(corePinProblem(adapter("^0.1.0"), "0.1.0")).toContain(
            '"^0.1.0"',
        );
    });
});
