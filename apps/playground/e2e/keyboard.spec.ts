import { expect, test } from "@playwright/test";
import { day, event, focused, log, openFixture, slot } from "./helpers";

// The keyboard model (D12): one tab stop, roving focus over the days or slots, Enter into a
// cell's events, Up and Down between them, Escape back; "+N more" is the last item of a day's
// events. Grabs (D13): Space grabs an event, arrows move it, Shift + arrows resize it, Enter drops.

test("month: one tab stop on today, arrows move by a day and a week", async ({
    page,
}) => {
    await openFixture(page, "bare");
    await expect(page.locator('[tabindex="0"]')).toHaveCount(1);
    // from the toolbar's last button, Tab enters the grid once
    await page.getByRole("button", { name: "List" }).focus();
    await page.keyboard.press("Tab");
    await expect
        .poll(() => focused(page))
        .toMatchObject({
            part: "day",
            date: "2026-11-26",
        });
    await page.keyboard.press("ArrowRight");
    await expect
        .poll(() => focused(page))
        .toMatchObject({ date: "2026-11-27" });
    await page.keyboard.press("ArrowDown");
    await expect
        .poll(() => focused(page))
        .toMatchObject({ date: "2026-12-04" });
    await page.keyboard.press("Home");
    await expect
        .poll(() => focused(page))
        .toMatchObject({ date: "2026-11-29" });
    // past the grid: the view follows
    await page.keyboard.press("PageDown");
    await expect
        .poll(() => focused(page))
        .toMatchObject({ date: "2026-12-29" });
});

test("Enter moves into a day's events, Up and Down between them, Escape back", async ({
    page,
}) => {
    await openFixture(page, "bare");
    await day(page, "2026-11-26").focus();
    await page.keyboard.press("Enter");
    await expect
        .poll(() => focused(page))
        .toMatchObject({
            part: "segment",
            occurrenceId: "holiday",
        });
    await page.keyboard.press("ArrowDown");
    await expect
        .poll(() => focused(page))
        .toMatchObject({
            occurrenceId: "standup",
        });
    await page.keyboard.press("Escape");
    await expect
        .poll(() => focused(page))
        .toMatchObject({
            part: "day",
            date: "2026-11-26",
        });
});

test('"+N more" is the last item of a day\'s events, and Enter on it is more-click', async ({
    page,
}) => {
    await openFixture(page, "more");
    const more = day(page, "2026-11-26").locator('[data-calendar-part="more"]');
    await expect(more).toHaveText("+3 more");
    await day(page, "2026-11-26").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(more).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(log(page).last()).toHaveText(/^more-click 2026-11-26 c,d,e$/);
    await page.keyboard.press("ArrowUp");
    await expect.poll(() => focused(page)).toMatchObject({ part: "segment" });
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await expect
        .poll(() => focused(page))
        .toMatchObject({
            part: "day",
            date: "2026-11-26",
        });
});

test("time grid: arrows over slots, Up from the first slot reaches the all-day row", async ({
    page,
}) => {
    await openFixture(page, "bare", { view: "week" });
    await slot(page, "2026-11-26", "09:00").focus();
    await page.keyboard.press("ArrowDown");
    await expect
        .poll(() => focused(page))
        .toMatchObject({
            part: "slot",
            time: "09:30",
        });
    await page.keyboard.press("ArrowLeft");
    await expect
        .poll(() => focused(page))
        .toMatchObject({
            date: "2026-11-25",
            time: "09:30",
        });
    await slot(page, "2026-11-26", "00:00").focus();
    await page.keyboard.press("ArrowUp");
    await expect
        .poll(() => focused(page))
        .toMatchObject({
            part: "day",
            date: "2026-11-26",
        });
    // Enter on a slot moves into the events starting in it
    await slot(page, "2026-11-26", "09:00").focus();
    await page.keyboard.press("Enter");
    await expect
        .poll(() => focused(page))
        .toMatchObject({
            part: "time-event",
            occurrenceId: "standup",
        });
});

test("keyboard move: Space grabs, arrows move by a day, Enter drops", async ({
    page,
}) => {
    await openFixture(page, "interaction");
    await event(page, "standup").focus();
    await page.keyboard.press(" ");
    await expect(event(page, "standup")).toHaveAttribute("data-grabbed", "");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(log(page).last()).toHaveText(
        "drop move standup 2026-11-27T09:00:00-05:00 2026-11-27T09:30:00-05:00",
    );
    await expect(event(day(page, "2026-11-27"), "standup")).toBeVisible();
});

test("keyboard resize: Shift + Down while grabbed in the time grid changes the end", async ({
    page,
}) => {
    await openFixture(page, "interaction", { view: "week" });
    await event(page, "review").focus();
    await page.keyboard.press(" ");
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Enter");
    await expect(log(page).last()).toHaveText(
        "drop resize review 2026-11-26T14:00:00-05:00 2026-11-26T16:00:00-05:00",
    );
});

test("Escape cancels a grab: nothing moves", async ({ page }) => {
    await openFixture(page, "interaction");
    await event(page, "standup").focus();
    await page.keyboard.press(" ");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await expect(event(day(page, "2026-11-26"), "standup")).toBeVisible();
    await expect(log(page)).toHaveCount(0);
});
