import { expect, test } from "@playwright/test";
import { column, openExample } from "../helpers";

// n-days: three days from today, then four or five with the view buttons; Next steps by the
// view's own length.

const columns = (stage: Awaited<ReturnType<typeof openExample>>) =>
    stage.locator('[data-calendar-part="column"]');

test("shows three days, and the buttons change how many", async ({ page }) => {
    const stage = await openExample(page, "n-days");
    await expect(columns(stage)).toHaveCount(3);
    await expect(stage.getByRole("button", { name: "3 days" })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    await stage.getByRole("button", { name: "5 days" }).click();
    await expect(columns(stage)).toHaveCount(5);
    await expect(stage.getByRole("button", { name: "5 days" })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    await expect(column(stage, "2026-11-30")).toBeAttached();
});

test("Next steps by the view's length", async ({ page }) => {
    const stage = await openExample(page, "n-days");
    await expect(column(stage, "2026-11-26")).toBeAttached();
    await stage.getByRole("button", { name: "Next days" }).click();
    await expect(column(stage, "2026-11-29")).toBeAttached();
    await expect(column(stage, "2026-12-01")).toBeAttached();
    await stage.getByRole("button", { name: "4 days" }).click();
    await expect(columns(stage)).toHaveCount(4);
    await stage.getByRole("button", { name: "Previous days" }).click();
    await expect(column(stage, "2026-11-25")).toBeAttached();
});
