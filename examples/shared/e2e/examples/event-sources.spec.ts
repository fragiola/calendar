import { expect, test } from "@playwright/test";
import { column, openExample } from "../helpers";

// event-sources: the week's days load from the fake server (a loading state while they do), and
// a week not fetched yet loads when it is shown; one already fetched does not load again.

const events = (scope: ReturnType<typeof column>) =>
    scope.locator('[data-calendar-part="time-event"]');

test("loads the shown week, then the next one when it is shown", async ({
    page,
}) => {
    const stage = await openExample(page, "event-sources");
    const status = stage.getByRole("status");
    await expect(status).toHaveText("Up to date");
    await expect(events(column(stage, "2026-11-23")).first()).toBeVisible();
    await expect(events(column(stage, "2026-11-23"))).toContainText([
        "Standup",
    ]);
    // the weekend has no meetings
    await expect(events(column(stage, "2026-11-22"))).toHaveCount(0);
    await stage.getByRole("button", { name: "Next week" }).click();
    await expect(status).toHaveText("Loading events…");
    await expect(stage.locator('[data-calendar-part="root"]')).toHaveAttribute(
        "aria-busy",
        "true",
    );
    await expect(status).toHaveText("Up to date");
    await expect(events(column(stage, "2026-11-30")).first()).toBeVisible();
    // back to a week already fetched: no loading
    await stage.getByRole("button", { name: "Previous week" }).click();
    await expect(events(column(stage, "2026-11-23")).first()).toBeVisible();
    await expect(status).toHaveText("Up to date");
});
