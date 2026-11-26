import { defineProject } from "vitest/config";

export default defineProject({
    test: {
        name: "core",
        // Node by default: the model must load and run without a DOM. Files that need one opt in
        // with a `// @vitest-environment jsdom` docblock.
        environment: "node",
        include: ["tests/**/*.test.ts"],
        // the host zone is forced, so no result depends on the machine's (D4); the root config
        // runs this project once per zone of HOST_TIME_ZONES
        env: { TZ: "UTC" },
    },
});
