import { expect, test } from "@playwright/test";
import {
    column,
    drag,
    eventNamed,
    openExample,
    pointIn,
    scrollTo,
    slot,
} from "../helpers";

// select-to-create: a drag over the slots selects a range, the selection opens the app's editor
// (a dialog), and Save runs event.add with the range's times; Cancel adds nothing. Either way the
// selection is cleared.

test("a drag over Tuesday's slots, a title, Save: the event is there", async ({
    page,
}) => {
    const stage = await openExample(page, "select-to-create");
    await scrollTo(stage, "08:00");
    await drag(
        page,
        await pointIn(slot(stage, "2026-11-24", "09:00"), 0.5, 0.3),
        await pointIn(slot(stage, "2026-11-24", "10:00"), 0.5, 0.6),
    );
    const dialog = page.getByRole("dialog", { name: "New event" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Tuesday");
    await dialog.getByRole("textbox", { name: "Title" }).fill("Design sync");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();
    const created = eventNamed(column(stage, "2026-11-24"), "Design sync");
    await expect(created).toBeVisible();
    await expect(created).toContainText("9:00 – 10:30 AM");
    await expect(
        stage.locator('[data-calendar-part="slot"][data-selected]'),
    ).toHaveCount(0);
});

test("Cancel adds nothing and clears the selection", async ({ page }) => {
    const stage = await openExample(page, "select-to-create");
    await scrollTo(stage, "08:00");
    await drag(
        page,
        await pointIn(slot(stage, "2026-11-27", "11:00"), 0.5, 0.3),
        await pointIn(slot(stage, "2026-11-27", "11:30"), 0.5, 0.6),
    );
    const dialog = page.getByRole("dialog", { name: "New event" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(
        eventNamed(column(stage, "2026-11-27"), "New event"),
    ).toHaveCount(0);
    await expect(
        stage.locator('[data-calendar-part="slot"][data-selected]'),
    ).toHaveCount(0);
});

test("the keyboard selects too: Shift + arrows from a slot, then Enter", async ({
    page,
}) => {
    const stage = await openExample(page, "select-to-create");
    await slot(stage, "2026-11-28", "10:00").focus();
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "New event" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("textbox", { name: "Title" }).fill("Gym");
    await dialog.getByRole("textbox", { name: "Title" }).press("Enter");
    await expect(eventNamed(column(stage, "2026-11-28"), "Gym")).toBeVisible();
});
