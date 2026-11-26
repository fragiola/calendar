import { expect, test } from "@playwright/test";
import { column, day, eventById, openExample } from "../helpers";

// all-day-and-multi-day: events longer than a day, split into one segment per week row (and per
// column for a timed event crossing midnight), each marking where it goes on.

test("a multi-week event is a segment per row, marked where it goes on", async ({
    page,
}) => {
    const stage = await openExample(page, "all-day-and-multi-day");
    // the vacation runs from Thursday 2026-11-19 to Saturday 2026-11-28
    const vacation = eventById(stage, "vacation");
    await expect(vacation).toHaveCount(2);
    await expect(
        eventById(day(stage, "2026-11-19"), "vacation"),
    ).toHaveAttribute("data-continues-after", "");
    const second = eventById(day(stage, "2026-11-22"), "vacation");
    await expect(second).toHaveAttribute("data-continues-before", "");
    await expect(second).not.toHaveAttribute("data-continues-after", "");
    // it spans the whole row: Sunday to Saturday
    const box = await second.boundingBox();
    const sunday = await day(stage, "2026-11-22").boundingBox();
    const saturday = await day(stage, "2026-11-28").boundingBox();
    if (!box || !sunday || !saturday) throw new Error("no boxes");
    expect(box.x).toBeLessThan(sunday.x + 8);
    expect(box.x + box.width).toBeGreaterThan(saturday.x + saturday.width - 8);
});

test("a one-day all-day event ends the next day (an exclusive end)", async ({
    page,
}) => {
    const stage = await openExample(page, "all-day-and-multi-day");
    const holiday = eventById(stage, "holiday");
    await expect(holiday).toHaveCount(1);
    const box = await holiday.boundingBox();
    const thursday = await day(stage, "2026-11-26").boundingBox();
    if (!box || !thursday) throw new Error("no boxes");
    expect(box.width).toBeLessThanOrEqual(thursday.width);
});

test("in the week, a timed event crossing midnight shows in both columns", async ({
    page,
}) => {
    const stage = await openExample(page, "all-day-and-multi-day");
    await stage.getByRole("button", { name: "Week" }).click();
    const tuesday = eventById(column(stage, "2026-11-24"), "release");
    const wednesday = eventById(column(stage, "2026-11-25"), "release");
    await expect(tuesday).toHaveAttribute("data-continues-after", "");
    await expect(wednesday).toHaveAttribute("data-continues-before", "");
    const allDay = stage.locator('[data-calendar-part="all-day-row"]');
    await expect(eventById(allDay, "sprint")).toHaveAttribute(
        "data-continues-after",
        "",
    );
});
