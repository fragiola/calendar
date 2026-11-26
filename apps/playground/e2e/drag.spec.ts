import { expect, test } from "@playwright/test";
import {
    day,
    drag,
    event,
    eventOf,
    log,
    openFixture,
    pointIn,
    scrollTo,
    slot,
} from "./helpers";

// Pointer gestures on the interaction fixture (every feature): move across days and between the
// all-day row and the time grid, resize, select a range to create, drop a task from outside. Each
// gesture runs one command on release; the engine's events are logged.

test("month: an event dragged to another day keeps its times", async ({
    page,
}) => {
    await openFixture(page, "interaction");
    await drag(
        page,
        await pointIn(event(page, "standup"), 0.3),
        await pointIn(day(page, "2026-11-30"), 0.3, 0.6),
    );
    await expect(log(page).last()).toHaveText(
        "drop move standup 2026-11-30T09:00:00-05:00 2026-11-30T09:30:00-05:00",
    );
    await expect(event(day(page, "2026-11-30"), "standup")).toBeVisible();
});

test("week: a timed event dragged to another day and time", async ({
    page,
}) => {
    await openFixture(page, "interaction", { view: "week" });
    await scrollTo(page, "08:00");
    const from = await pointIn(event(page, "review"), 0.5, 0.25);
    const to = await pointIn(slot(page, "2026-11-27", "16:00"), 0.5, 0.5);
    await drag(page, from, to);
    await expect(log(page).last()).toHaveText(
        "drop move review 2026-11-27T16:00:00-05:00 2026-11-27T17:00:00-05:00",
    );
});

test("week: a timed event dropped on the all-day row becomes all-day, and back", async ({
    page,
}) => {
    await openFixture(page, "interaction", { view: "week" });
    await scrollTo(page, "08:00");
    const allDayRow = page.locator('[data-calendar-part="all-day-row"]');
    await drag(
        page,
        await pointIn(event(page, "review"), 0.5, 0.25),
        await pointIn(day(allDayRow, "2026-11-27")),
    );
    await expect(log(page).last()).toHaveText(
        "drop move review 2026-11-27 2026-11-28",
    );
    await expect(event(allDayRow, "review")).toBeVisible();
    // an all-day event dropped into the time grid starts at the slot, for the default duration;
    // the pointer crosses the scroller's top edge (autoscroll), so the target is read once there
    const from = await pointIn(event(allDayRow, "review"), 0.2);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x - 8, from.y + 8, { steps: 4 });
    const middle = await pointIn(slot(page, "2026-11-25", "14:00"));
    await page.mouse.move(middle.x, middle.y, { steps: 6 });
    const to = await pointIn(slot(page, "2026-11-25", "13:00"), 0.5, 0.25);
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
    await expect(log(page).last()).toHaveText(
        "drop move review 2026-11-25T13:00:00-05:00 2026-11-25T14:00:00-05:00",
    );
});

test("week: dragging a resize handle changes the end", async ({ page }) => {
    await openFixture(page, "interaction", { view: "week" });
    await scrollTo(page, "08:00");
    const handle = event(page, "review").locator(
        '[data-calendar-part="resize-handle"]',
    );
    await drag(
        page,
        await pointIn(handle),
        await pointIn(slot(page, "2026-11-26", "16:00"), 0.5, 0.9),
    );
    await expect(log(page).last()).toHaveText(
        "drop resize review 2026-11-26T14:00:00-05:00 2026-11-26T16:30:00-05:00",
    );
});

test("select-to-create: a drag over slots selects the range", async ({
    page,
}) => {
    await openFixture(page, "interaction", { view: "week" });
    await scrollTo(page, "08:00");
    await drag(
        page,
        await pointIn(slot(page, "2026-11-25", "10:00"), 0.5, 0.3),
        await pointIn(slot(page, "2026-11-25", "11:30"), 0.5, 0.6),
    );
    await expect(log(page).last()).toHaveText(
        "select 2026-11-25T10:00:00-05:00 2026-11-25T12:00:00-05:00",
    );
    await expect(slot(page, "2026-11-25", "11:00")).toHaveAttribute(
        "data-selected",
        "",
    );
});

test("external drop: a task dragged onto a slot becomes an event there", async ({
    page,
}) => {
    await openFixture(page, "interaction", { view: "week" });
    await scrollTo(page, "08:00");
    await page.getByTestId("task").dragTo(slot(page, "2026-11-24", "15:00"), {
        targetPosition: { x: 30, y: 5 },
    });
    await expect(log(page).last()).toHaveText(/^external-drop \S+$/);
    await expect(
        page
            .getByRole("grid")
            .getByRole("listitem")
            .filter({ hasText: "Write the report" }),
    ).toBeVisible();
});

test("right to left: the columns run from the right, arrows follow the reading order", async ({
    page,
}) => {
    await openFixture(page, "interaction", { view: "week", dir: "rtl" });
    await scrollTo(page, "08:00");
    const sunday = await slot(page, "2026-11-22", "09:00").boundingBox();
    const saturday = await slot(page, "2026-11-28", "09:00").boundingBox();
    if (!sunday || !saturday) throw new Error("no boxes");
    expect(sunday.x).toBeGreaterThan(saturday.x);
    await slot(page, "2026-11-26", "09:00").focus();
    await page.keyboard.press("ArrowLeft");
    await expect(slot(page, "2026-11-27", "09:00")).toBeFocused();
    // a drag to the left moves to a later day
    await drag(
        page,
        await pointIn(event(page, "review"), 0.5, 0.25),
        await pointIn(slot(page, "2026-11-27", "14:00"), 0.5, 0.25),
    );
    await expect(log(page).last()).toHaveText(
        "drop move review 2026-11-27T14:00:00-05:00 2026-11-27T15:00:00-05:00",
    );
});

test("recurring: dragging one occurrence moves only it (the default scope)", async ({
    page,
}) => {
    await openFixture(page, "interaction");
    const first = eventOf(day(page, "2026-11-24"), "weekly");
    await expect(eventOf(page, "weekly")).toHaveCount(3);
    await drag(
        page,
        await pointIn(first, 0.3),
        await pointIn(day(page, "2026-11-25"), 0.3, 0.6),
    );
    await expect(log(page).last()).toHaveText(/^drop move weekly@/);
    await expect(eventOf(day(page, "2026-11-25"), "weekly")).toBeVisible();
    await expect(eventOf(day(page, "2026-12-01"), "weekly")).toBeVisible();
});
