import { expect, test } from "@playwright/test";
import { day, eventById, focused, grid, openExample } from "../helpers";

// month: the November 2026 grid on the fixed clock, its navigation, and "+N more" opening the day.

test("shows the month of today, today marked, a multi-day event over its days", async ({
    page,
}) => {
    const stage = await openExample(page, "month");
    await expect(
        stage.getByRole("heading", { name: "November 2026" }),
    ).toBeVisible();
    await expect(grid(stage, "Month").getByRole("gridcell")).toHaveCount(42);
    await expect(day(stage, "2026-11-26")).toHaveAttribute("data-today", "");
    await expect(eventById(stage, "offsite")).toBeVisible();
    await expect(eventById(stage, "offsite")).toHaveText("Team offsite");
});

test("the buttons step a month and come back to today", async ({ page }) => {
    const stage = await openExample(page, "month");
    await stage.getByRole("button", { name: "Next month" }).click();
    await expect(
        stage.getByRole("heading", { name: "December 2026" }),
    ).toBeVisible();
    await stage.getByRole("button", { name: "Today" }).click();
    await expect(
        stage.getByRole("heading", { name: "November 2026" }),
    ).toBeVisible();
});

test('"+N more" opens the day as an agenda, and Month comes back', async ({
    page,
}) => {
    const stage = await openExample(page, "month");
    const more = day(stage, "2026-11-26").locator(
        '[data-calendar-part="more"]',
    );
    await expect(more).toHaveText(/^\+\d+ more$/);
    await more.click();
    const agenda = stage.locator(
        '[data-calendar-part="list-day"][data-date="2026-11-26"]',
    );
    await expect(agenda.getByRole("listitem")).toHaveCount(5);
    await expect(agenda).toContainText("Team lunch");
    await stage.getByRole("button", { name: "Month", exact: true }).click();
    await expect(grid(stage, "Month")).toBeVisible();
});

test("the arrows move the roving focus over the days", async ({ page }) => {
    const stage = await openExample(page, "month");
    await day(stage, "2026-11-26").focus();
    await page.keyboard.press("ArrowDown");
    await expect
        .poll(() => focused(page))
        .toMatchObject({ date: "2026-12-03" });
});
