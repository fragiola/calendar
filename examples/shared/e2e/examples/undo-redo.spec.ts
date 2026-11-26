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

// undo-redo: a drag is one step; the buttons and Ctrl+Z / Ctrl+Shift+Z put the events back.

test("undoes and redoes a drag, from the buttons and the keyboard", async ({
    page,
}) => {
    const stage = await openExample(page, "undo-redo");
    const undo = stage.getByRole("button", { name: "Undo" });
    const redo = stage.getByRole("button", { name: "Redo" });
    await expect(undo).toBeDisabled();
    await scrollTo(stage, "08:00");
    // Monday's sprint planning (10:00), dragged to Tuesday at 10:00
    await drag(
        page,
        await pointIn(eventById(stage, "planning"), 0.5, 0.2),
        await pointIn(slot(stage, "2026-11-24", "10:00"), 0.5, 0.2),
    );
    const tuesday = eventById(column(stage, "2026-11-24"), "planning");
    const monday = eventById(column(stage, "2026-11-23"), "planning");
    await expect(tuesday).toBeVisible();
    await expect(stage.getByRole("status")).toContainText("event.move");
    await undo.click();
    await expect(monday).toBeVisible();
    await expect(redo).toBeEnabled();
    await redo.click();
    await expect(tuesday).toBeVisible();
    await page.keyboard.press("Control+z");
    await expect(monday).toBeVisible();
    await page.keyboard.press("Control+Shift+z");
    await expect(tuesday).toBeVisible();
});
