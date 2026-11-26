import { expect, test } from "@playwright/test";
import {
    column,
    drag,
    eventById,
    openExample,
    pointIn,
    scrollTo,
    slot,
} from "../helpers";

// save-and-restore: the calendar's JSON, its view included, saved to local storage and read back on
// reload; Reset forgets it.

test("a saved move and week come back after a reload, and Reset forgets them", async ({
    page,
}) => {
    let stage = await openExample(page, "save-and-restore");
    await expect(stage.getByRole("status")).toHaveText("Nothing saved yet.");
    await scrollTo(stage, "08:00");
    await drag(
        page,
        await pointIn(eventById(stage, "planning"), 0.5, 0.2),
        await pointIn(slot(stage, "2026-11-24", "10:00"), 0.5, 0.2),
    );
    await expect(
        eventById(column(stage, "2026-11-24"), "planning"),
    ).toBeVisible();
    await stage.getByRole("button", { name: "Save" }).click();
    await expect(stage.getByRole("status")).toContainText("Saved");
    await page.reload();
    stage = page.getByTestId("stage");
    await expect(stage.getByRole("status")).toHaveText(
        "Restored the saved calendar.",
    );
    await expect(
        eventById(column(stage, "2026-11-24"), "planning"),
    ).toBeAttached();
    // the view is saved too: next week, saved, comes back
    await stage.getByRole("button", { name: "Next week" }).click();
    await expect(column(stage, "2026-12-01")).toBeAttached();
    await stage.getByRole("button", { name: "Save" }).click();
    await page.reload();
    await expect(
        column(page.getByTestId("stage"), "2026-12-01"),
    ).toBeAttached();
    await page
        .getByTestId("stage")
        .getByRole("button", { name: "Reset" })
        .click();
    stage = page.getByTestId("stage");
    await expect(column(stage, "2026-11-23")).toBeAttached();
    await expect(
        eventById(column(stage, "2026-11-23"), "planning"),
    ).toBeAttached();
    await page.reload();
    await expect(page.getByTestId("stage").getByRole("status")).toHaveText(
        "Nothing saved yet.",
    );
});
