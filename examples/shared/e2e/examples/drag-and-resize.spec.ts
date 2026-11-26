import { expect, test } from "@playwright/test";
import {
    column,
    day,
    drag,
    eventById,
    openExample,
    pointIn,
    scrollTo,
    slot,
} from "../helpers";

// drag-and-resize: moves across days, into the all-day row and across weeks of the month, a
// resize from a handle, and the keyboard's grab; each drop runs one command, which the example
// reports in its status line.

test("Monday's sprint planning dragged to Tuesday at 10:00", async ({
    page,
}) => {
    const stage = await openExample(page, "drag-and-resize");
    await scrollTo(stage, "08:00");
    await drag(
        page,
        await pointIn(eventById(stage, "planning"), 0.5, 0.2),
        await pointIn(slot(stage, "2026-11-24", "10:00"), 0.5, 0.2),
    );
    await expect(
        eventById(column(stage, "2026-11-24"), "planning"),
    ).toBeVisible();
    await expect(stage.getByRole("status")).toHaveText(
        "Moved “Sprint planning”: 10:00 – 11:30 AM",
    );
});

test("the design review's end handle, dragged to 4:00 PM", async ({ page }) => {
    const stage = await openExample(page, "drag-and-resize");
    await scrollTo(stage, "10:00");
    const handle = eventById(column(stage, "2026-11-24"), "design").locator(
        '[data-calendar-part="resize-handle"][data-edge="end"]',
    );
    await drag(
        page,
        await pointIn(handle),
        await pointIn(slot(stage, "2026-11-24", "15:30"), 0.5, 0.9),
    );
    await expect(stage.getByRole("status")).toHaveText(
        "Resized “Design review”: 2:00 – 4:00 PM",
    );
});

test("a timed event dropped on the all-day row becomes all-day", async ({
    page,
}) => {
    const stage = await openExample(page, "drag-and-resize");
    await scrollTo(stage, "08:00");
    const allDay = stage.locator('[data-calendar-part="all-day-row"]');
    await drag(
        page,
        await pointIn(eventById(stage, "planning"), 0.5, 0.2),
        await pointIn(day(allDay, "2026-11-25")),
    );
    await expect(eventById(allDay, "planning")).toBeVisible();
    await expect(stage.getByRole("status")).toHaveText(
        "Moved “Sprint planning”: all day",
    );
});

test("month: the offsite dragged to the next week", async ({ page }) => {
    const stage = await openExample(page, "drag-and-resize");
    await stage.getByRole("button", { name: "Month", exact: true }).click();
    await expect(stage.getByRole("grid", { name: "Month" })).toBeVisible();
    await drag(
        page,
        await pointIn(eventById(stage, "offsite"), 0.2),
        await pointIn(day(stage, "2026-11-30"), 0.5, 0.7),
    );
    await expect(eventById(day(stage, "2026-11-30"), "offsite")).toBeVisible();
});

test("the keyboard: Space grabs, arrows move, Enter drops", async ({
    page,
}) => {
    const stage = await openExample(page, "drag-and-resize");
    const planning = eventById(stage, "planning");
    await planning.focus();
    await page.keyboard.press(" ");
    await expect(planning).toHaveAttribute("data-grabbed", "");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(
        eventById(column(stage, "2026-11-24"), "planning"),
    ).toBeVisible();
    // Down moves by the snap step (a slot, 30 minutes)
    await expect(stage.getByRole("status")).toHaveText(
        "Moved “Sprint planning”: 10:30 AM – 12:00 PM",
    );
});
