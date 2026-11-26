import { defineConfig } from "tsdown";

export default defineConfig({
    // the main entry and one entry per feature (`@fragiola/calendar-react/<feature>`): the main entry
    // never imports a feature's code (scripts/check-features.ts checks the built chunks)
    entry: {
        index: "src/index.ts",
        selection: "src/selection/index.ts",
        "drag-and-drop": "src/drag-and-drop/index.ts",
        resize: "src/resize/index.ts",
        "external-drop": "src/external-drop/index.ts",
        "now-indicator": "src/now-indicator/index.ts",
        constraints: "src/constraints/index.ts",
        recurrence: "src/recurrence/index.ts",
        "event-sources": "src/event-sources/index.ts",
    },
    format: "esm",
    platform: "browser",
    dts: true,
    sourcemap: true,
    clean: true,
    // the declarations are built from src only: tsconfig.json also takes in the tests and the
    // configs, which import the repo's scripts/, and their declarations would be written there
    tsconfig: "tsconfig.build.json",
});
