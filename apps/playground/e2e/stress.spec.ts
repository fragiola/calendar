import { expect, type Page, test } from "@playwright/test";
import {
    day,
    drag,
    event,
    openFixture,
    pointIn,
    scrollTo,
    slot,
} from "./helpers";

// The stress fixture: 2 000 events and every feature. Each week row's and each column's children
// function counts its calls (`window.renders`); moving one event calls them again only for the
// rows or columns it left and entered (D11: the layout keeps the others' objects, and the
// collection parts call a stable children function, the fixture's `useCallback`, only for a changed
// one).

const renders = (page: Page) =>
    page.evaluate(() => ({
        ...(window as unknown as { renders: Record<string, number> }).renders,
    }));

function changed(
    before: Record<string, number>,
    after: Record<string, number>,
) {
    return Object.keys(after)
        .filter((key) => after[key] !== before[key])
        .sort();
}

test("month: moving an event re-renders the two week rows it touches", async ({
    page,
}) => {
    await openFixture(page, "stress");
    await expect(
        page.locator('[data-calendar-part="segment"]').first(),
    ).toBeVisible();
    const before = await renders(page);
    expect(Object.keys(before)).toHaveLength(6);
    // the first event shown on 2026-11-26, moved to 2026-11-30 (the next row)
    const moved = page
        .locator(
            '[data-calendar-part="day"][data-date="2026-11-26"] [data-calendar-part="segment"]',
        )
        .first();
    const id = await moved.getAttribute("data-occurrence-id");
    await drag(
        page,
        await pointIn(moved, 0.3),
        await pointIn(day(page, "2026-11-30"), 0.5, 0.2),
    );
    await expect(
        day(page, "2026-11-26").locator(
            `[data-calendar-part="segment"][data-occurrence-id="${id}"]`,
        ),
    ).toHaveCount(0);
    await page.waitForTimeout(200);
    expect(changed(before, await renders(page))).toEqual([
        "week 2026-11-22",
        "week 2026-11-29",
    ]);
});

test("week: moving an event re-renders the two columns it touches", async ({
    page,
}) => {
    await openFixture(page, "stress", { view: "week" });
    await scrollTo(page, "06:00");
    const before = await renders(page);
    const columns = Object.keys(before).filter((key) =>
        key.startsWith("column"),
    );
    expect(columns).toHaveLength(7);
    // e28: Sunday 2026-11-22, 08:00–09:00, moved to Monday at 07:00
    const date = "2026-11-22";
    const target = "2026-11-23";
    const from = await pointIn(event(page, "e28"), 0.5, 0.2);
    await drag(
        page,
        from,
        await pointIn(slot(page, target, "07:00"), 0.5, 0.2),
    );
    await expect(
        page.locator(
            `[data-calendar-part="column"][data-date="${target}"] [data-calendar-part="time-event"][data-occurrence-id="e28"]`,
        ),
    ).toHaveCount(1);
    await page.waitForTimeout(200);
    expect(
        changed(before, await renders(page)).filter((key) =>
            key.startsWith("column"),
        ),
    ).toEqual([`column ${date}`, `column ${target}`].sort());
});
