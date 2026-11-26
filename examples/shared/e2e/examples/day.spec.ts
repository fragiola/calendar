import { expect, test } from "@playwright/test";
import { column, eventById, grid, openExample, slot } from "../helpers";

// day: one column for today (Thursday 2026-11-26), the now line in it, a step of one day.

test("shows today's column with its events and the now line at noon", async ({
    page,
}) => {
    const stage = await openExample(page, "day");
    await expect(
        stage.getByRole("heading", { name: "Thursday, November 26" }),
    ).toBeVisible();
    await expect(grid(stage, "Day").getByRole("columnheader")).toHaveCount(1);
    const today = column(stage, "2026-11-26");
    await expect(eventById(today, "lunch")).toContainText("Team lunch");
    const now = today.getByTestId("now");
    await expect(now).toBeAttached();
    const line = await now.boundingBox();
    const noon = await slot(stage, "2026-11-26", "12:00").boundingBox();
    if (!line || !noon) throw new Error("no boxes");
    expect(Math.abs(line.y + line.height / 2 - noon.y)).toBeLessThanOrEqual(2);
});

test("Next and Previous step one day", async ({ page }) => {
    const stage = await openExample(page, "day");
    await stage.getByRole("button", { name: "Next day" }).click();
    await expect(column(stage, "2026-11-27")).toBeAttached();
    await expect(eventById(stage, "launch")).toBeVisible();
    // no now line on another day
    await expect(stage.getByTestId("now")).toHaveCount(0);
    await stage.getByRole("button", { name: "Previous day" }).click();
    await stage.getByRole("button", { name: "Previous day" }).click();
    await expect(column(stage, "2026-11-25")).toBeAttached();
});
