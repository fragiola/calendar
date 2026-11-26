import { join } from "node:path";
import angular from "@analogjs/vite-plugin-angular";
import { defaultClientConditions, defaultServerConditions } from "vite";
import { defineProject } from "vitest/config";
import { withSourceCondition } from "../../scripts/source-condition.ts";

export default defineProject({
    // the directives compiled by the Angular compiler (TypeScript 6.0.3, this package's); the
    // tsconfig by its path, so a run from the repository's root finds it too
    plugins: [
        angular({ tsconfig: join(import.meta.dirname, "tsconfig.spec.json") }),
    ],
    // the core and the package's own entries from their sources (the source export condition), in
    // either environment: client (jsdom, most tests) and server (`server.test.ts`)
    resolve: { conditions: withSourceCondition(defaultClientConditions) },
    ssr: {
        resolve: { conditions: withSourceCondition(defaultServerConditions) },
    },
    test: {
        name: "angular",
        environment: "jsdom",
        include: ["tests/**/*.test.ts"],
        setupFiles: ["tests/setup.ts"],
        // the host zone is forced, so no result depends on the machine's (D4)
        env: { TZ: "UTC" },
    },
});
