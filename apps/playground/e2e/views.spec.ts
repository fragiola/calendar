import { expect, test } from "@playwright/test";
import { column, day, event, openFixture } from "./helpers";

// Month, week, day and list views of the bare fixture (no feature), on the fixed clock (Thursday
// 2026-11-26 in New York), and the navigation buttons that run the view commands.

test("month: six weeks from Sunday 2026-11-01, today marked, a multi-day event once", async ({
    page,
}) => {
    await openFixture(page, "bare");
    const grid = page.getByRole("grid");
    await expect(grid.getByRole("row")).toHaveCount(1 + 6);
    await expect(grid.getByRole("gridcell")).toHaveCount(42);
    await expect(day(page, "2026-11-01")).toBeVisible();
    await expect(day(page, "2026-12-12")).toHaveAttribute("data-outside", "");
    await expect(day(page, "2026-11-26")).toHaveAttribute("data-today", "");
    await expect(event(page, "trip")).toHaveCount(1);
    // the segment spans its three days: Monday to Wednesday
    const trip = await event(page, "trip").boundingBox();
    const monday = await day(page, "2026-11-23").boundingBox();
    const wednesday = await day(page, "2026-11-25").boundingBox();
    if (!trip || !monday || !wednesday) throw new Error("no boxes");
    expect(Math.abs(trip.x - monday.x)).toBeLessThanOrEqual(1);
    expect(
        Math.abs(trip.x + trip.width - (wednesday.x + wednesday.width)),
    ).toBeLessThanOrEqual(1);
});

test("the navigation buttons move by the view's step, and Today comes back", async ({
    page,
}) => {
    await openFixture(page, "bare");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(day(page, "2026-12-31")).toBeVisible();
    await expect(day(page, "2026-12-31")).not.toHaveAttribute(
        "data-outside",
        "",
    );
    await page.getByRole("button", { name: "Previous" }).click();
    await page.getByRole("button", { name: "Previous" }).click();
    await expect(day(page, "2026-10-15")).toBeVisible();
    await page.getByRole("button", { name: "Today" }).click();
    await expect(day(page, "2026-11-26")).toHaveAttribute("data-today", "");
});

test("week: seven columns of 48 slots, timed events positioned by their times", async ({
    page,
}) => {
    await openFixture(page, "bare", { view: "week" });
    await expect(page.getByRole("button", { name: "Week" })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    await expect(page.locator('[data-calendar-part="column"]')).toHaveCount(7);
    await expect(column(page, "2026-11-22")).toBeAttached();
    await expect(column(page, "2026-11-28")).toBeAttached();
    await expect(page.locator('[data-calendar-part="slot-row"]')).toHaveCount(
        48,
    );
    // 09:00–09:30 and 09:15–10:15 overlap: side by side
    const standup = await event(page, "standup").boundingBox();
    const review = await event(page, "review").boundingBox();
    if (!standup || !review) throw new Error("no boxes");
    expect(review.x).toBeGreaterThan(standup.x);
    expect(review.y).toBeGreaterThan(standup.y);
    // the all-day row holds the all-day and multi-day events
    const allDayRow = page.locator('[data-calendar-part="all-day-row"]');
    await expect(event(allDayRow, "holiday")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(column(page, "2026-12-05")).toBeAttached();
});

test("day: one column, stepping one day", async ({ page }) => {
    await openFixture(page, "bare", { view: "day" });
    await expect(page.locator('[data-calendar-part="column"]')).toHaveCount(1);
    await expect(column(page, "2026-11-26")).toBeAttached();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(column(page, "2026-11-27")).toBeAttached();
    await expect(event(page, "lunch")).toBeVisible();
});

test("list: a list per day with events, under the app's heading", async ({
    page,
}) => {
    await openFixture(page, "bare", { view: "list" });
    const days = page.locator('[data-calendar-part="list-day"]');
    await expect(days.first()).toHaveAttribute("role", "list");
    await expect(
        page
            .locator('[data-calendar-part="list-day"][data-date="2026-11-26"]')
            .getByRole("listitem"),
    ).toHaveCount(3);
    await expect(
        page.getByRole("heading", { name: "2026-11-26" }),
    ).toBeVisible();
});
