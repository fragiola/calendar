import { defineConfig, devices } from "@playwright/test";

const CI = Boolean(process.env.CI);
// the playground's port (vite.config.ts reads the same variable)
const PORT = Number(process.env.PLAYGROUND_PORT ?? 5173);

// The zone, the locale and the clock are fixed, so no date in a spec depends on the machine: the
// browser runs in America/New_York (`timezoneId`, the zone of the DST fixture's week), the dev
// server too (`TZ`), and every fixture reads an injected clock (src/fixture/calendar.tsx).
process.env.TZ = "America/New_York";

export default defineConfig({
    testDir: "e2e",
    fullyParallel: true,
    forbidOnly: CI,
    retries: CI ? 2 : 0,
    workers: CI ? 2 : 4,
    reporter: CI ? [["line"], ["html", { open: "never" }]] : "line",
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: "on-first-retry",
        timezoneId: "America/New_York",
        locale: "en-US",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
            testIgnore: /\.touch\.spec\.ts$/,
        },
        // touch: a long press starts a drag (the engine's `longPressDelay`)
        {
            name: "mobile",
            use: { ...devices["Pixel 7"] },
            testMatch: /\.touch\.spec\.ts$/,
        },
    ],
    webServer: {
        command: "pnpm dev",
        url: `http://localhost:${PORT}`,
        env: { TZ: "America/New_York" },
        reuseExistingServer: !CI,
    },
});
