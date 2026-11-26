import { defineConfig } from "vitest/config";

/** The host zones the core's suite runs under, each with the same expectations (D4). */
const HOST_TIME_ZONES = ["UTC", "America/Sao_Paulo"] as const;

export default defineConfig({
    test: {
        // the packages and the site (the repository's script tests); the playground and the
        // examples apps join with the React Epic. The core runs once per forced host zone, so no
        // date result depends on the machine's (America/Sao_Paulo has historic DST).
        projects: [
            "packages/*",
            "!packages/core",
            ...HOST_TIME_ZONES.map((timeZone) => ({
                extends: "./packages/core/vitest.config.ts",
                root: "packages/core",
                test: { name: `core (TZ=${timeZone})`, env: { TZ: timeZone } },
            })),
            "site",
        ],
    },
});
