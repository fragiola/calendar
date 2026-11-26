import { expect, test } from "@playwright/test";
import { column, eventById, grid, openExample, slot } from "../helpers";

// week: the week of 2026-11-22 on the fixed clock, its all-day row and its timed events placed by
// their times.

test("shows the week's seven days, all-day events in their row, timed events at their times", async ({
    page,
}) => {
    const stage = await openExample(page, "week");
    await expect(
        stage.getByRole("heading", { name: "Nov 22 – 28, 2026" }),
    ).toBeVisible();
    await expect(grid(stage, "Week").getByRole("columnheader")).toHaveCount(7);
    await expect(stage.locator('[data-calendar-part="column"]')).toHaveCount(7);
    const allDay = stage.locator('[data-calendar-part="all-day-row"]');
    await expect(eventById(allDay, "offsite")).toHaveText("Team offsite");
    // sprint planning: Monday 10:00–11:30, from the 10:00 slot's top
    const planning = eventById(column(stage, "2026-11-23"), "planning");
    await expect(planning).toContainText("Sprint planning");
    const box = await planning.boundingBox();
    const ten = await slot(stage, "2026-11-23", "10:00").boundingBox();
    if (!box || !ten) throw new Error("no boxes");
    expect(Math.abs(box.y - ten.y)).toBeLessThanOrEqual(1);
    expect(Math.round(box.height / ten.height)).toBe(3);
});

test("opens on the morning: 08:00 is in view", async ({ page }) => {
    const stage = await openExample(page, "week");
    await expect(slot(stage, "2026-11-26", "08:00")).toBeInViewport();
});
