import { expect, test } from "@playwright/test";
import { column, eventById, openExample, scrollTo, slot } from "../helpers";

// time-zones: the display zone moves every event to its wall clock there; an event written in
// another zone sits at its instant; the New York DST weekend keeps 09:00 on the 09:00 slot.

test("switching the display zone moves the events to that zone's wall clock", async ({
    page,
}) => {
    const stage = await openExample(page, "time-zones");
    const board = eventById(stage, "london-board");
    // 15:00 in London is 10:00 in New York
    await expect(board).toContainText("10:00 – 11:00 AM");
    await stage.getByRole("radio", { name: "London" }).click();
    await expect(board).toContainText("3:00 – 4:00 PM");
    // the Tokyo standup, Wednesday 09:00 in Tokyo, is Wednesday at midnight in London
    await expect(
        eventById(column(stage, "2026-11-25"), "tokyo-standup"),
    ).toContainText("12:00 – 12:30 AM");
    await stage.getByRole("radio", { name: "Tokyo" }).click();
    await expect(
        eventById(column(stage, "2026-11-25"), "tokyo-standup"),
    ).toContainText("9:00 – 9:30 AM");
});

test("the DST weekend in New York: 09:00 stays on the 09:00 slot on both sides", async ({
    page,
}) => {
    const stage = await openExample(page, "time-zones");
    await stage.getByRole("button", { name: "DST weekend" }).click();
    await expect(stage.locator('[data-calendar-part="column"]')).toHaveCount(4);
    await expect(column(stage, "2026-10-31")).toBeAttached();
    await expect(column(stage, "2026-11-03")).toBeAttached();
    await scrollTo(stage, "08:00");
    for (const [id, date] of [
        ["breakfast-edt", "2026-10-31"],
        ["breakfast-est", "2026-11-02"],
    ] as const) {
        const box = await eventById(stage, id).boundingBox();
        const nine = await slot(stage, date, "09:00").boundingBox();
        if (!box || !nine) throw new Error("no boxes");
        expect(Math.abs(box.y - nine.y), id).toBeLessThanOrEqual(2);
    }
    // 00:30 EDT to 03:30 EST: on the wall clock from 00:30 to 03:30 (four real hours)
    await scrollTo(stage, "00:00");
    const night = await eventById(stage, "night-shift").boundingBox();
    const from = await slot(stage, "2026-11-01", "00:30").boundingBox();
    const to = await slot(stage, "2026-11-01", "03:30").boundingBox();
    if (!night || !from || !to) throw new Error("no boxes");
    expect(Math.abs(night.y - from.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(night.y + night.height - to.y)).toBeLessThanOrEqual(2);
});
