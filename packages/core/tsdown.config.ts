import { defineConfig } from "tsdown";

export default defineConfig({
    // the main entry, and one entry per opt-in feature (`@fragiola/calendar/<feature>`): the main
    // entry never imports a feature's code (scripts/check-features.ts checks the built chunks)
    entry: {
        index: "src/index.ts",
        recurrence: "src/recurrence/index.ts",
        constraints: "src/constraints/index.ts",
        "event-sources": "src/event-sources/index.ts",
    },
    format: "esm",
    platform: "browser",
    dts: true,
    sourcemap: true,
    clean: true,
});
