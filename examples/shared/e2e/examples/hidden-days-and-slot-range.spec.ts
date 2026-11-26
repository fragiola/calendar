import { expect, test } from "@playwright/test";
import { column, grid, openExample, slot } from "../helpers";

// hidden-days-and-slot-range: a working week (Monday to Friday), 07:00 to 20:00 in 15-minute slots.

test("shows Monday to Friday, from 07:00 to 19:45 in 15-minute slots", async ({
    page,
}) => {
    const stage = await openExample(page, "hidden-days-and-slot-range");
    await expect(
        grid(stage, "Working week").getByRole("columnheader"),
    ).toHaveCount(5);
    await expect(column(stage, "2026-11-23")).toBeAttached();
    await expect(column(stage, "2026-11-27")).toBeAttached();
    await expect(column(stage, "2026-11-22")).toHaveCount(0);
    await expect(column(stage, "2026-11-28")).toHaveCount(0);
    const rows = stage.locator('[data-calendar-part="slot-row"]');
    await expect(rows).toHaveCount(13 * 4);
    await expect(rows.first()).toHaveAttribute("data-time", "07:00");
    await expect(rows.last()).toHaveAttribute("data-time", "19:45");
    await expect(slot(stage, "2026-11-23", "07:15")).toBeAttached();
});

test("navigation and the keys skip the hidden days", async ({ page }) => {
    const stage = await openExample(page, "hidden-days-and-slot-range");
    await stage.getByRole("button", { name: "Next week" }).click();
    await expect(column(stage, "2026-11-30")).toBeAttached();
    await expect(column(stage, "2026-12-04")).toBeAttached();
    await slot(stage, "2026-12-04", "09:00").focus();
    await page.keyboard.press("ArrowRight");
    // past Friday: the next shown day, Monday, in the next week
    await expect(slot(stage, "2026-12-07", "09:00")).toBeFocused();
});
