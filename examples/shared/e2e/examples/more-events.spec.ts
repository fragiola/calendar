import { expect, test } from "@playwright/test";
import { day, focused, openExample, settled } from "../helpers";

// more-events: two events a day; "+N more" opens Fragiola UI's popover with the day's events, from
// a press and from the keyboard (the link is the last item of the day's events).

const more = (stage: ReturnType<typeof day>) =>
    stage.locator('[data-calendar-part="more"]');

test("a day shows two events and a +N more link for the rest", async ({
    page,
}) => {
    const stage = await openExample(page, "more-events");
    const thursday = day(stage, "2026-11-26");
    // the conference started on Wednesday: it is Wednesday's list item, over Thursday too
    await expect(thursday.getByRole("listitem")).toHaveCount(1);
    await expect(more(thursday)).toHaveText("+5 more");
    await expect(more(day(stage, "2026-11-17"))).toHaveCount(0);
});

test("a press on +N more opens the day's events in a popover; Escape closes it", async ({
    page,
}) => {
    const stage = await openExample(page, "more-events");
    await more(day(stage, "2026-11-26")).click();
    const popover = page.getByRole("dialog");
    await expect(popover).toBeVisible();
    await expect(popover.getByRole("heading")).toHaveText(
        "Thursday, November 26",
    );
    await expect(popover.getByRole("listitem")).toHaveCount(7);
    await expect(popover).toContainText("Team lunch");
    // a press on +N more while its popover is open is the engine's more-click again: it stays open
    // (the trigger's own toggle is the app's, never the calendar's)
    await more(day(stage, "2026-11-26")).click();
    await settled(page);
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(popover).toBeVisible();
    await expect(popover).not.toHaveAttribute("data-closed");
    await page.keyboard.press("Escape");
    await expect(popover).toBeHidden();
});

test("the keyboard reaches +N more after the day's events, and Enter opens it", async ({
    page,
}) => {
    const stage = await openExample(page, "more-events");
    await day(stage, "2026-11-26").focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => focused(page)).toMatchObject({ part: "segment" });
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => focused(page)).toMatchObject({ part: "segment" });
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => focused(page)).toMatchObject({ part: "more" });
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
});
