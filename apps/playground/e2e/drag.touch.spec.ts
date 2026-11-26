import { expect, type Page, test } from "@playwright/test";
import { day, event, log, openFixture, pointIn, settled } from "./helpers";

// Touch, on a phone's emulation (the `mobile` project): a press on an event that is not focused
// starts a drag only after a long press (`longPressDelay`, 500 ms), so a swipe scrolls the page
// instead; after it, the moves drag and the release drops.

/** Touch input through the DevTools protocol, one session for a whole gesture. */
async function finger(page: Page) {
    const session = await page.context().newCDPSession(page);
    const send = (
        type: "touchStart" | "touchMove" | "touchEnd",
        point: { x: number; y: number },
    ) =>
        session.send("Input.dispatchTouchEvent", {
            type,
            touchPoints:
                type === "touchEnd" ? [] : [{ x: point.x, y: point.y }],
        });
    return {
        start: (point: { x: number; y: number }) => send("touchStart", point),
        move: (point: { x: number; y: number }) => send("touchMove", point),
        end: (point: { x: number; y: number }) => send("touchEnd", point),
    };
}

test("a long press on an event, then a move, drops it on another day", async ({
    page,
}) => {
    await openFixture(page, "interaction");
    const from = await pointIn(event(page, "standup"), 0.3);
    const to = await pointIn(day(page, "2026-11-27"), 0.3, 0.6);
    const touch = await finger(page);
    await touch.start(from);
    // the long press (500 ms): the event shows it is dragged once it has passed
    await expect(event(page, "standup")).toHaveAttribute("data-dragging", "");
    for (let step = 1; step <= 6; step++) {
        await touch.move({
            x: from.x + ((to.x - from.x) * step) / 6,
            y: from.y + ((to.y - from.y) * step) / 6,
        });
    }
    await touch.end(to);
    await expect(log(page).last()).toHaveText(
        "drop move standup 2026-11-27T09:00:00-05:00 2026-11-27T09:30:00-05:00",
    );
});

test("a quick swipe is no drag", async ({ page }) => {
    await openFixture(page, "interaction");
    const from = await pointIn(event(page, "standup"), 0.3);
    const to = await pointIn(day(page, "2026-11-27"), 0.3, 0.6);
    const touch = await finger(page);
    await touch.start(from);
    await touch.move({ x: (from.x + to.x) / 2, y: from.y });
    await touch.move(to);
    await touch.end(to);
    await settled(page);
    await expect(log(page).filter({ hasText: "drop" })).toHaveCount(0);
    await expect(page.locator("[data-dragging]")).toHaveCount(0);
    await expect(event(day(page, "2026-11-26"), "standup")).toBeVisible();
});
