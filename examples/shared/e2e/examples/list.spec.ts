import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";

// list: the month's days with events, each a list under its heading; a month without events
// shows the example's empty state.

test("lists the month's days with events under their headings", async ({
    page,
}) => {
    const stage = await openExample(page, "list");
    const thursday = stage.getByRole("list", { name: "Thursday, November 26" });
    await expect(thursday.getByRole("listitem")).toHaveCount(5);
    await expect(thursday.getByRole("listitem").first()).toContainText(
        "All day",
    );
    await expect(thursday).toContainText("Team lunch");
    // a day without events is not listed
    await expect(
        stage.locator(
            '[data-calendar-part="list-day"][data-date="2026-11-22"]',
        ),
    ).toHaveCount(0);
    // every event is a tab stop of its own
    await thursday.getByRole("listitem").first().focus();
    await page.keyboard.press("Tab");
    await expect(thursday.getByRole("listitem").nth(1)).toBeFocused();
});

test("a month without events shows the empty state", async ({ page }) => {
    const stage = await openExample(page, "list");
    await stage.getByRole("button", { name: "Next month" }).click();
    await stage.getByRole("button", { name: "Next month" }).click();
    await expect(
        stage.getByRole("heading", { name: "January 2027" }),
    ).toBeVisible();
    await expect(stage.getByText("Nothing planned this month.")).toBeVisible();
});
