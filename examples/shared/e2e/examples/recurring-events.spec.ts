import { expect, type Locator, type Page, test } from "@playwright/test";
import {
    column,
    drag,
    eventNamed,
    openExample,
    pointIn,
    scrollTo,
    slot,
} from "../helpers";

// recurring-events: a weekday standup at 09:00. Dragging one occurrence an hour later asks which
// events change: this one (an override), this and the following ones (the series splits), or all
// of them; Cancel changes nothing.

const DAYS = [
    "2026-11-23",
    "2026-11-24",
    "2026-11-25",
    "2026-11-26",
    "2026-11-27",
];

const standup = (stage: Locator, date: string) =>
    eventNamed(column(stage, date), "Standup");

/** The slot a day's standup starts in, by its position. */
async function startsAt(stage: Locator, date: string): Promise<string> {
    const box = await standup(stage, date).boundingBox();
    for (const time of ["09:00", "10:00"]) {
        const at = await slot(stage, date, time).boundingBox();
        if (box && at && Math.abs(box.y - at.y) <= 1) return time;
    }
    return "elsewhere";
}

async function moveStandup(page: Page, stage: Locator, date: string) {
    await drag(
        page,
        await pointIn(standup(stage, date), 0.5, 0.5),
        await pointIn(slot(stage, date, "10:00"), 0.5, 0.5),
    );
    const dialog = page.getByRole("dialog", { name: "Edit recurring event" });
    await expect(dialog).toBeVisible();
    return dialog;
}

async function starts(stage: Locator) {
    const times: string[] = [];
    for (const date of DAYS) times.push(await startsAt(stage, date));
    return times;
}

test.beforeEach(async ({ page }) => {
    const stage = await openExample(page, "recurring-events");
    await scrollTo(stage, "08:00");
    await expect(standup(stage, "2026-11-23")).toBeVisible();
});

test("This event: only Wednesday's standup moves", async ({ page }) => {
    const stage = page.getByTestId("stage");
    const dialog = await moveStandup(page, stage, "2026-11-25");
    await dialog.getByRole("button", { name: "This event" }).click();
    await expect(dialog).toBeHidden();
    await expect
        .poll(() => starts(stage))
        .toEqual(["09:00", "09:00", "10:00", "09:00", "09:00"]);
});

test("This and following events: Wednesday on moves, Monday and Tuesday stay", async ({
    page,
}) => {
    const stage = page.getByTestId("stage");
    const dialog = await moveStandup(page, stage, "2026-11-25");
    await dialog
        .getByRole("button", { name: "This and following events" })
        .click();
    await expect
        .poll(() => starts(stage))
        .toEqual(["09:00", "09:00", "10:00", "10:00", "10:00"]);
});

test("All events: every standup moves", async ({ page }) => {
    const stage = page.getByTestId("stage");
    const dialog = await moveStandup(page, stage, "2026-11-25");
    await dialog.getByRole("button", { name: "All events" }).click();
    await expect
        .poll(() => starts(stage))
        .toEqual(["10:00", "10:00", "10:00", "10:00", "10:00"]);
});

test("Cancel moves nothing", async ({ page }) => {
    const stage = page.getByTestId("stage");
    const dialog = await moveStandup(page, stage, "2026-11-25");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    expect(await starts(stage)).toEqual([
        "09:00",
        "09:00",
        "09:00",
        "09:00",
        "09:00",
    ]);
});
