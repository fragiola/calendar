import { defaultClientConditions, defaultServerConditions } from "vite";
import { defineProject } from "vitest/config";
import { withSourceCondition } from "../../scripts/source-condition.ts";

export default defineProject({
    // The core from its sources (the source export condition), not its dist, in either
    // environment: client (jsdom, these tests) and server (a test that opts into node).
    resolve: {
        conditions: withSourceCondition(defaultClientConditions),
        // the full build: the tests' calendars are templates, compiled at runtime as an SFC's are
        alias: [{ find: /^vue$/, replacement: "vue/dist/vue.esm-bundler.js" }],
    },
    ssr: {
        resolve: { conditions: withSourceCondition(defaultServerConditions) },
    },
    define: {
        __VUE_OPTIONS_API__: "true",
        __VUE_PROD_DEVTOOLS__: "false",
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "true",
    },
    test: {
        name: "vue",
        environment: "jsdom",
        include: ["tests/**/*.test.ts"],
        setupFiles: ["tests/setup.ts"],
        // the host zone is forced, so no result depends on the machine's (D4)
        env: { TZ: "UTC" },
    },
});
