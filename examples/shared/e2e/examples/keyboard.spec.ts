import { expect, test } from "@playwright/test";
import { column, eventById, focused, openExample, slot } from "../helpers";

// keyboard: roving focus, into a slot's events, a grab moved and resized with the arrows, and the
// app's live region wording the engine's announcements.

test("Tab enters the grid once, the arrows move over the slots, Enter goes into the events", async ({
    page,
}) => {
    const stage = await openExample(page, "keyboard");
    await stage.getByRole("button", { name: "Next week" }).focus();
    await page.keyboard.press("Tab");
    await expect
        .poll(() => focused(page))
        .toMatchObject({
            part: "slot",
            date: "2026-11-26",
        });
    await slot(stage, "2026-11-23", "10:00").focus();
    await page.keyboard.press("Enter");
    await expect
        .poll(() => focused(page))
        .toMatchObject({
            part: "time-event",
            occurrenceId: "planning",
        });
    await page.keyboard.press("Escape");
    await expect
        .poll(() => focused(page))
        .toMatchObject({
            part: "slot",
            date: "2026-11-23",
            time: "10:00",
        });
});

test("Space grabs, the arrows move, Enter drops, and the live region says each step", async ({
    page,
}) => {
    const stage = await openExample(page, "keyboard");
    const announcer = stage.getByTestId("announcer");
    await eventById(stage, "planning").focus();
    await page.keyboard.press(" ");
    await expect(eventById(stage, "planning")).toHaveAttribute(
        "data-grabbed",
        "",
    );
    await expect(announcer).toHaveText(/^Sprint planning grabbed\./);
    await page.keyboard.press("ArrowRight");
    await expect(announcer).toHaveText(/Tuesday/);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(announcer).toHaveText(/^Sprint planning moved to Tuesday/);
    const moved = eventById(column(stage, "2026-11-24"), "planning");
    await expect(moved).toBeVisible();
    // 10:30–12:00: one snap step (30 minutes) later
    await expect(moved).toContainText("10:30");
});

test("Shift + arrows while grabbed resize the event", async ({ page }) => {
    const stage = await openExample(page, "keyboard");
    const announcer = stage.getByTestId("announcer");
    await eventById(stage, "planning").focus();
    await page.keyboard.press(" ");
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Enter");
    await expect(announcer).toHaveText(/moved to/);
    await expect(eventById(stage, "planning")).toContainText(
        "10:00 AM – 12:30 PM",
    );
});

test("Escape cancels a grab, and Shift + arrows on a slot select a range", async ({
    page,
}) => {
    const stage = await openExample(page, "keyboard");
    const announcer = stage.getByTestId("announcer");
    await eventById(stage, "planning").focus();
    await page.keyboard.press(" ");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await expect(announcer).toHaveText("Sprint planning left where it was.");
    await expect(
        eventById(column(stage, "2026-11-23"), "planning"),
    ).toBeVisible();
    await slot(stage, "2026-11-27", "14:00").focus();
    await page.keyboard.press("Shift+ArrowDown");
    await expect(announcer).toHaveText(/^Selected Friday/);
    await expect(slot(stage, "2026-11-27", "14:30")).toHaveAttribute(
        "data-selected",
        "",
    );
});

test("PageDown shows the next week on the same cell, and the live region says the range", async ({
    page,
}) => {
    const stage = await openExample(page, "keyboard");
    const status = stage.getByRole("status");
    const cell = slot(stage, "2026-11-26", "10:00");
    await cell.focus();
    const before = await cell.elementHandle();
    await page.keyboard.press("PageDown");
    await expect
        .poll(() => focused(page))
        .toMatchObject({ part: "slot", date: "2026-12-03", time: "10:00" });
    // the cells are keyed by position: focus stayed on the element, no focus event to hear
    expect(
        await page.evaluate(
            (element) => element === document.activeElement,
            before,
        ),
    ).toBe(true);
    await expect(status).toHaveText(
        /^November 29\s–\sDecember 5, 2026\. Thursday, December 3.*10:00\sAM\.$/,
    );
    await page.keyboard.press("PageUp");
    await expect(status).toHaveText(
        /^November 22\s–\s28, 2026\. Thursday, November 26/,
    );
});
