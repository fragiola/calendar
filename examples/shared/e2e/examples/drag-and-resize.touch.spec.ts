import { expect, type Page, test } from "@playwright/test";
import {
    column,
    eventById,
    openExample,
    pointIn,
    scrollTo,
    settled,
    slot,
} from "../helpers";

// drag-and-resize on a phone (the `mobile` project): a press on an event that is not focused
// starts a drag only after a long press, then the finger drags it; a quick swipe does not.

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

test("a long press on the sprint planning, then a move, drops it on Tuesday", async ({
    page,
}) => {
    const stage = await openExample(page, "drag-and-resize");
    await scrollTo(stage, "08:00");
    const planning = eventById(stage, "planning");
    const from = await pointIn(planning, 0.5, 0.2);
    const to = await pointIn(slot(stage, "2026-11-24", "10:00"), 0.5, 0.2);
    const touch = await finger(page);
    await touch.start(from);
    // the long press (500 ms): the event shows it is dragged once it has passed
    await expect(planning).toHaveAttribute("data-dragging", "");
    for (let step = 1; step <= 6; step++) {
        await touch.move({
            x: from.x + ((to.x - from.x) * step) / 6,
            y: from.y + ((to.y - from.y) * step) / 6,
        });
    }
    await touch.end(to);
    await expect(
        eventById(column(stage, "2026-11-24"), "planning"),
    ).toBeVisible();
});

test("a quick swipe moves nothing", async ({ page }) => {
    const stage = await openExample(page, "drag-and-resize");
    await scrollTo(stage, "08:00");
    const from = await pointIn(eventById(stage, "planning"), 0.5, 0.2);
    const to = await pointIn(slot(stage, "2026-11-24", "10:00"), 0.5, 0.2);
    const touch = await finger(page);
    await touch.start(from);
    await touch.move({ x: (from.x + to.x) / 2, y: from.y });
    await touch.move(to);
    await touch.end(to);
    await settled(page);
    await expect(stage.locator("[data-dragging]")).toHaveCount(0);
    await expect(
        eventById(column(stage, "2026-11-23"), "planning"),
    ).toBeVisible();
});
