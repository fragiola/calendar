import { expect, test } from "@playwright/test";
import {
    column,
    drag,
    eventById,
    focused,
    grid,
    openExample,
    pointIn,
    scrollTo,
    slot,
} from "../helpers";

// rtl: an Arabic week, right to left (Saturday first): the columns run from the right, the arrows
// follow the reading order, and a drag lands where the pointer is.

test("the week runs from the right: Saturday first, Friday last", async ({
    page,
}) => {
    const stage = await openExample(page, "rtl");
    await expect(grid(stage)).toHaveAccessibleName("الأسبوع");
    const saturday = await column(stage, "2026-11-21").boundingBox();
    const friday = await column(stage, "2026-11-27").boundingBox();
    if (!saturday || !friday) throw new Error("no boxes");
    expect(saturday.x).toBeGreaterThan(friday.x);
});

test("ArrowLeft moves to the next day, ArrowRight to the previous one", async ({
    page,
}) => {
    const stage = await openExample(page, "rtl");
    await slot(stage, "2026-11-25", "09:00").focus();
    await page.keyboard.press("ArrowLeft");
    await expect
        .poll(() => focused(page))
        .toMatchObject({ date: "2026-11-26" });
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect
        .poll(() => focused(page))
        .toMatchObject({ date: "2026-11-24" });
});

test("a drag to the left moves an event to a later day", async ({ page }) => {
    const stage = await openExample(page, "rtl");
    await scrollTo(stage, "08:00");
    await drag(
        page,
        await pointIn(eventById(stage, "planning"), 0.5, 0.2),
        await pointIn(slot(stage, "2026-11-24", "10:00"), 0.5, 0.2),
    );
    await expect(
        eventById(column(stage, "2026-11-24"), "planning"),
    ).toBeVisible();
});
