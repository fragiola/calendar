import { expect, test } from "@playwright/test";
import {
    collectErrors,
    EXAMPLES,
    grid,
    openExample,
    reset,
    THEMES,
} from "./helpers";

// Every example mounts and logs no error, in every theme (there are five), and comes back after
// the site's Reset; a new example folder is covered without touching this file.

for (const example of EXAMPLES) {
    for (const theme of THEMES) {
        test(`${example.slug} renders in ${theme.name}`, async ({ page }) => {
            const errors = collectErrors(page);
            const stage = await openExample(page, example.slug, {
                theme: theme.name,
            });
            // a calendar view: a named grid, or a list view's lists
            const view = stage.locator(
                '[data-calendar-part="day-grid"], [data-calendar-part="time-grid"], [data-calendar-part="list"]',
            );
            await expect(view.first()).toBeVisible();
            const named = grid(stage);
            if ((await named.count()) > 0) {
                await expect(named).toHaveAccessibleName(/.+/);
            }
            // the site's Reset reloads the frame: the example must come back
            await reset(page);
            expect(errors).toEqual([]);
        });
    }
}
