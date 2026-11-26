import { expect, type Locator, type Page } from "@playwright/test";

// What the playground specs share. Like the examples' specs, they reach the calendar only through
// `data-calendar-part`, `data-date`, `data-time`, roles, accessible names and test ids.

/** Opens a fixture page (`bare`, `interaction`, …) with its URL options, once it has mounted. */
export async function openFixture(
    page: Page,
    name: string,
    query: Record<string, string> = {},
) {
    await page.goto(`/fixtures/${name}/?${new URLSearchParams(query)}`);
    await expect(page.locator('[data-calendar-part="root"]')).toBeVisible();
    // the engine attaches in a layout effect: the tab stop is its first write
    await expect(page.locator('[tabindex="0"]').first()).toBeAttached();
}

/** A day of a day grid (a month's day, an all-day cell). */
export const day = (scope: Page | Locator, date: string) =>
    scope.locator(`[data-calendar-part="day"][data-date="${date}"]`);

/** A time-grid slot. */
export const slot = (scope: Page | Locator, date: string, time: string) =>
    scope.locator(
        `[data-calendar-part="slot"][data-date="${date}"][data-time="${time}"]`,
    );

/** A time-grid column. */
export const column = (scope: Page | Locator, date: string) =>
    scope.locator(`[data-calendar-part="column"][data-date="${date}"]`);

/** An occurrence's element(s), by its accessible name (the fixtures name it by its id). */
export const event = (scope: Page | Locator, occurrenceId: string) =>
    scope.getByRole("listitem", { name: occurrenceId, exact: true });

/** The engine's events, as the fixture logs them. */
export const log = (page: Page) => page.getByTestId("log").locator("li");

/** The element that has DOM focus: its part, date, time and occurrence id. */
export function focused(page: Page) {
    return page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        return {
            part: element?.dataset.calendarPart,
            date: element?.dataset.date,
            time: element?.dataset.time,
            occurrenceId: element?.dataset.occurrenceId,
        };
    });
}

/** Scrolls the time grid so that `time` (`HH:mm`) is its first visible slot. */
export async function scrollTo(page: Page, time: string) {
    const row = page.locator(
        `[data-calendar-part="slot-row"][data-time="${time}"]`,
    );
    await row.evaluate((element) => {
        const scroller = element.closest<HTMLElement>(
            '[data-calendar-part="scroller"]',
        );
        if (scroller) {
            scroller.scrollTop +=
                element.getBoundingClientRect().top -
                scroller.getBoundingClientRect().top;
        }
    });
}

/** An occurrence's element(s) of an event, by its event id (a series has several). */
export const eventOf = (scope: Page | Locator, eventId: string) =>
    scope.locator(`[data-event-id="${eventId}"]`);

/** A point in a locator's box, at fractions of its width and height. */
export async function pointIn(locator: Locator, x = 0.5, y = 0.5) {
    const box = await locator.boundingBox();
    if (!box) throw new Error("no bounding box");
    return { x: box.x + box.width * x, y: box.y + box.height * y };
}

/** A mouse drag from a point of `from` to a point of `to`, in steps, past the drag threshold. */
export async function drag(
    page: Page,
    from: { x: number; y: number },
    to: { x: number; y: number },
) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 8, from.y + 8, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.up();
}
