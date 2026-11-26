import { expect, test } from "@playwright/test";
import {
    column,
    drag,
    eventById,
    openExample,
    pointIn,
    scrollTo,
    slot,
} from "../helpers";

// edit-rules: the model refuses what the rules forbid, so a refused drop runs nothing: a read-only
// calendar's event, a locked event, a move into the past (a middleware); an allowed move runs.

test("a company event (read-only calendar) stays where it is", async ({
    page,
}) => {
    const stage = await openExample(page, "edit-rules");
    await scrollTo(stage, "10:00");
    await drag(
        page,
        await pointIn(eventById(stage, "lunch"), 0.5, 0.3),
        await pointIn(slot(stage, "2026-11-27", "12:00"), 0.5, 0.3),
    );
    await expect(eventById(column(stage, "2026-11-26"), "lunch")).toBeVisible();
    await expect(eventById(column(stage, "2026-11-27"), "lunch")).toHaveCount(
        0,
    );
});

test("the locked interview stays, and says it is locked", async ({ page }) => {
    const stage = await openExample(page, "edit-rules");
    await scrollTo(stage, "08:00");
    const interview = eventById(stage, "interview");
    await expect(interview.getByRole("img", { name: "Locked" })).toBeVisible();
    await drag(
        page,
        await pointIn(interview, 0.5, 0.3),
        await pointIn(slot(stage, "2026-11-27", "09:30"), 0.5, 0.3),
    );
    await expect(
        eventById(column(stage, "2026-11-25"), "interview"),
    ).toBeVisible();
});

test("nothing moves into the past; a move into the future runs", async ({
    page,
}) => {
    const stage = await openExample(page, "edit-rules");
    await scrollTo(stage, "11:00");
    const demo = () => eventById(stage, "demo");
    // Wednesday is before now (Thursday noon): refused by the middleware
    await drag(
        page,
        await pointIn(demo(), 0.5, 0.3),
        await pointIn(slot(stage, "2026-11-25", "15:00"), 0.5, 0.3),
    );
    await expect(eventById(column(stage, "2026-11-26"), "demo")).toBeVisible();
    await drag(
        page,
        await pointIn(demo(), 0.5, 0.3),
        await pointIn(slot(stage, "2026-11-27", "15:00"), 0.5, 0.3),
    );
    await expect(eventById(column(stage, "2026-11-27"), "demo")).toBeVisible();
});
