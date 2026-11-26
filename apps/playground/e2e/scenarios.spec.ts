import { expect, type Page, test } from "@playwright/test";

// Scenarios are dev-only entries of the playground; the Inspector shows what a scenario's model
// does: every committed command, the calendar's JSON and every [data-calendar-part] element's
// state.

const inspector = (page: Page) =>
    page.getByRole("complementary", { name: "Inspector" });
const commandNames = (page: Page) =>
    inspector(page).getByTestId("command-name");

async function open(page: Page, scenario: string) {
    await page.goto(`/?scenario=${scenario}&inspect=1`);
    await expect(
        page.getByTestId("stage").locator('[data-calendar-part="root"]'),
    ).toBeVisible();
    await expect(inspector(page)).toBeVisible();
}

test("logs each command a button runs, and the model JSON follows", async ({
    page,
}) => {
    await open(page, "api/commands");
    await page.getByRole("button", { name: "Add lunch" }).click();
    await expect(commandNames(page).first()).toHaveText("event.add");
    await page
        .getByRole("button", { name: "Move standup", exact: true })
        .click();
    await expect(commandNames(page).first()).toHaveText("event.move");
    // one listener: each command is logged once, also under StrictMode
    await expect(commandNames(page)).toHaveCount(2);
    await inspector(page).getByRole("button", { name: "Model" }).click();
    await expect(inspector(page).getByTestId("model-json")).toContainText(
        '"title": "Lunch"',
    );
});

test("shows the parts' state, the focus included", async ({ page }) => {
    await open(page, "views/every-view");
    await inspector(page).getByRole("button", { name: "State" }).click();
    await page
        .locator(
            '[data-calendar-part="slot"][data-date="2026-11-26"][data-time="09:00"]',
        )
        .focus();
    await expect(
        inspector(page).locator('[data-state-path="slot 2026-11-26 09:00"]'),
    ).toContainText("data-focused");
});

test("the view buttons run view.set", async ({ page }) => {
    await open(page, "views/every-view");
    await page
        .getByTestId("stage")
        .getByRole("button", { name: "Month" })
        .click();
    await expect(commandNames(page).first()).toHaveText("view.set");
});
