import { defineConfig } from "tsdown";

export default defineConfig({
    // the main entry, and later one entry per opt-in feature (`@fragiola/calendar/<feature>`): the
    // main entry never imports a feature's code (scripts/check-features.ts checks the built chunks)
    entry: {
        index: "src/index.ts",
    },
    format: "esm",
    platform: "browser",
    dts: true,
    sourcemap: true,
    clean: true,
});
