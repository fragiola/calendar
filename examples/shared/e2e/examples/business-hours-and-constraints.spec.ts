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

// business-hours-and-constraints: the constraints refuse a move out of business hours (to a
// weekend or before 09:00) and onto a company event, so the drop leaves the event; a move within
// the rules runs.

test("the slots within business hours are marked, the weekend's are not", async ({
    page,
}) => {
    const stage = await openExample(page, "business-hours-and-constraints");
    await expect(slot(stage, "2026-11-24", "10:00")).toHaveAttribute(
        "data-business-hours",
        "",
    );
    await expect(slot(stage, "2026-11-28", "10:00")).not.toHaveAttribute(
        "data-business-hours",
        "",
    );
    await expect(slot(stage, "2026-11-24", "08:00")).not.toHaveAttribute(
        "data-business-hours",
        "",
    );
});

test("a move to Saturday leaves the retrospective on Friday", async ({
    page,
}) => {
    const stage = await openExample(page, "business-hours-and-constraints");
    await scrollTo(stage, "12:00");
    await drag(
        page,
        await pointIn(eventById(stage, "retro"), 0.5, 0.3),
        await pointIn(slot(stage, "2026-11-28", "16:00"), 0.5, 0.3),
    );
    await expect(eventById(column(stage, "2026-11-27"), "retro")).toBeVisible();
    await expect(eventById(column(stage, "2026-11-28"), "retro")).toHaveCount(
        0,
    );
});

test("a move before 09:00 is refused", async ({ page }) => {
    const stage = await openExample(page, "business-hours-and-constraints");
    await scrollTo(stage, "07:00");
    await drag(
        page,
        await pointIn(eventById(stage, "planning"), 0.5, 0.2),
        await pointIn(slot(stage, "2026-11-23", "08:00"), 0.5, 0.2),
    );
    const planning = await eventById(stage, "planning").boundingBox();
    const ten = await slot(stage, "2026-11-23", "10:00").boundingBox();
    if (!planning || !ten) throw new Error("no boxes");
    expect(Math.abs(planning.y - ten.y)).toBeLessThanOrEqual(1);
});

test("nothing overlaps a company event (the lunch); Wednesday, free, takes the demo", async ({
    page,
}) => {
    const stage = await openExample(page, "business-hours-and-constraints");
    await scrollTo(stage, "10:00");
    const demo = () => eventById(stage, "demo");
    await drag(
        page,
        await pointIn(demo(), 0.5, 0.3),
        await pointIn(slot(stage, "2026-11-26", "12:00"), 0.5, 0.3),
    );
    const box = await demo().boundingBox();
    const three = await slot(stage, "2026-11-26", "15:00").boundingBox();
    if (!box || !three) throw new Error("no boxes");
    expect(Math.abs(box.y - three.y)).toBeLessThanOrEqual(1);
    await drag(
        page,
        await pointIn(demo(), 0.5, 0.3),
        await pointIn(slot(stage, "2026-11-25", "11:00"), 0.5, 0.3),
    );
    await expect(eventById(column(stage, "2026-11-25"), "demo")).toBeVisible();
});
