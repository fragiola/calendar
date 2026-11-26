import { expect, test } from "@playwright/test";
import {
    column,
    drag,
    event,
    log,
    openFixture,
    pointIn,
    scrollTo,
    slot,
} from "./helpers";

// A DST week in America/New_York (the browser's zone and the display zone): daylight saving time
// ends on Sunday 2026-11-01. Wall-clock times keep their slots on both sides of the change, and a
// move by whole days keeps the wall clock (D4).

test("events at 09:00 sit on the 09:00 slot before and after the change", async ({
    page,
}) => {
    await openFixture(page, "dst", { view: "week", date: "2026-11-01" });
    await expect(column(page, "2026-11-01")).toBeAttached();
    for (const [id, date] of [
        ["before", "2026-10-31"],
        ["after", "2026-11-02"],
    ] as const) {
        const box = await event(page, id).boundingBox();
        const nine = await slot(page, date, "09:00").boundingBox();
        if (!box || !nine) throw new Error("no boxes");
        expect(Math.abs(box.y - nine.y), id).toBeLessThanOrEqual(1);
    }
    // 00:30 EDT to 03:30 EST lasts four hours, shown from 00:30 to 03:30 on the wall clock
    const night = await event(page, "night").boundingBox();
    const start = await slot(page, "2026-11-01", "00:30").boundingBox();
    const end = await slot(page, "2026-11-01", "03:30").boundingBox();
    if (!night || !start || !end) throw new Error("no boxes");
    expect(Math.abs(night.y - start.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(night.y + night.height - end.y)).toBeLessThanOrEqual(1);
});

test("a drag by one day across the change keeps 09:00 on the wall clock", async ({
    page,
}) => {
    await openFixture(page, "dst", { view: "week", date: "2026-11-01" });
    await scrollTo(page, "06:00");
    await drag(
        page,
        await pointIn(event(page, "before"), 0.5, 0.25),
        await pointIn(slot(page, "2026-11-01", "09:00"), 0.5, 0.25),
    );
    await expect(log(page)).toHaveCount(0);
    await expect(event(page, "before")).toBeVisible();
    const box = await event(page, "before").boundingBox();
    const nine = await slot(page, "2026-11-01", "09:00").boundingBox();
    if (!box || !nine) throw new Error("no boxes");
    expect(Math.abs(box.y - nine.y)).toBeLessThanOrEqual(1);
});
