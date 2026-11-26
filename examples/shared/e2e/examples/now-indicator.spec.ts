import { expect, test } from "@playwright/test";
import { column, openExample, slot } from "../helpers";

// now-indicator: the current time (12:00 on the fixed clock) as a line in today's column only;
// past days carry data-past.

test("draws the now line in today's column, at the current time", async ({
    page,
}) => {
    const stage = await openExample(page, "now-indicator");
    const now = stage.locator('[data-calendar-part="now-indicator"]');
    await expect(now).toHaveCount(1);
    await expect(
        column(stage, "2026-11-26").locator(
            '[data-calendar-part="now-indicator"]',
        ),
    ).toHaveCount(1);
    await expect(now).toHaveAttribute("aria-hidden", "true");
    const line = await now.boundingBox();
    const noon = await slot(stage, "2026-11-26", "12:00").boundingBox();
    if (!line || !noon) throw new Error("no boxes");
    expect(Math.abs(line.y - noon.y)).toBeLessThanOrEqual(1);
});

test("marks the days before today as past", async ({ page }) => {
    const stage = await openExample(page, "now-indicator");
    await expect(column(stage, "2026-11-25")).toHaveAttribute("data-past", "");
    await expect(column(stage, "2026-11-26")).not.toHaveAttribute(
        "data-past",
        "",
    );
    await expect(column(stage, "2026-11-27")).not.toHaveAttribute(
        "data-past",
        "",
    );
});

test("shows no line in another week", async ({ page }) => {
    const stage = await openExample(page, "now-indicator");
    await stage.getByRole("button", { name: "Next week" }).click();
    await expect(column(stage, "2026-12-03")).toBeAttached();
    await expect(
        stage.locator('[data-calendar-part="now-indicator"]'),
    ).toHaveCount(0);
});
