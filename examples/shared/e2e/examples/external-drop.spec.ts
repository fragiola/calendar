import { expect, test } from "@playwright/test";
import {
    column,
    eventNamed,
    openExample,
    pointIn,
    scrollTo,
    slot,
} from "../helpers";

// external-drop: a task dragged from the list (a native drag) becomes an event where it lands and
// leaves the list; a dropped file becomes an event named after it.

test("a task dragged onto Friday at 10:00 becomes an event there", async ({
    page,
}) => {
    const stage = await openExample(page, "external-drop");
    await scrollTo(stage, "08:00");
    const tasks = stage.getByRole("list", { name: "Tasks" });
    await tasks
        .getByRole("listitem")
        .filter({ hasText: "Review invoices" })
        .dragTo(slot(stage, "2026-11-27", "10:00"), {
            targetPosition: { x: 20, y: 6 },
        });
    const event = eventNamed(column(stage, "2026-11-27"), "Review invoices");
    await expect(event).toBeVisible();
    await expect(event).toContainText("10:00 – 10:30 AM");
    await expect(
        tasks.getByRole("listitem").filter({ hasText: "Review invoices" }),
    ).toHaveCount(0);
});

test("a file dropped on Saturday becomes an event named after it", async ({
    page,
}) => {
    const stage = await openExample(page, "external-drop");
    await scrollTo(stage, "08:00");
    const target = slot(stage, "2026-11-28", "10:00");
    const point = await pointIn(target, 0.5, 0.3);
    const dataTransfer = await page.evaluateHandle(() => {
        const data = new DataTransfer();
        data.items.add(
            new File(["agenda"], "notes.txt", { type: "text/plain" }),
        );
        return data;
    });
    for (const type of ["dragenter", "dragover", "drop"]) {
        await target.dispatchEvent(type, {
            dataTransfer,
            clientX: point.x,
            clientY: point.y,
            bubbles: true,
            cancelable: true,
        });
    }
    await expect(
        eventNamed(column(stage, "2026-11-28"), "Read notes.txt"),
    ).toBeVisible();
});
