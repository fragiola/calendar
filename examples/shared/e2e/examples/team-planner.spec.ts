import { expect, type Page, test } from "@playwright/test";
import {
    column,
    drag,
    eventById,
    eventNamed,
    openExample,
    openHosted,
    pointIn,
    scrollTo,
    slot,
} from "../helpers";

// team-planner: the landing's showcase. The calendars panel shows and hides people, a selected
// range opens the event editor, and an edit of the recurring standup asks for its scope.

/** A mouse drag over a day's slots, from one `HH:mm` to another (both included). */
async function select(
    page: Page,
    scope: Parameters<typeof slot>[0],
    date: string,
    from: string,
    to: string,
) {
    await drag(
        page,
        await pointIn(slot(scope, date, from), 0.5, 0.3),
        await pointIn(slot(scope, date, to), 0.5, 0.6),
    );
}

test("the calendars panel hides and shows a person's events", async ({
    page,
}) => {
    const stage = await openExample(page, "team-planner");
    const alan = stage.getByRole("checkbox", { name: "Alan" });
    await expect(alan).toBeChecked();
    await expect(eventById(stage, "focus")).toHaveCount(1);
    await alan.click();
    await expect(alan).not.toBeChecked();
    await expect(eventById(stage, "focus")).toHaveCount(0);
    await alan.click();
    await expect(eventById(stage, "focus")).toHaveCount(1);
});

test("a selected range opens the editor, and Save adds the event", async ({
    page,
}) => {
    const stage = await openExample(page, "team-planner");
    await scrollTo(stage, "13:00");
    await select(page, stage, "2026-11-25", "16:00", "16:30");
    const dialog = page.getByRole("dialog", { name: "New event" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("textbox", { name: "Title" }).fill("Planning poker");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();
    await expect(
        eventNamed(column(stage, "2026-11-25"), "Planning poker"),
    ).toContainText("4:00 – 5:00 PM");
});

test("moving an occurrence of the standup asks for its scope", async ({
    page,
}) => {
    const stage = await openExample(page, "team-planner");
    await scrollTo(stage, "08:00");
    await expect(eventById(stage, "standup")).toHaveCount(5);
    // Tuesday's standup, dragged to 10:00: "All events" moves every weekday's
    await drag(
        page,
        await pointIn(
            eventById(column(stage, "2026-11-24"), "standup"),
            0.3,
            0.5,
        ),
        await pointIn(slot(stage, "2026-11-24", "10:00"), 0.3, 0.5),
    );
    const dialog = page.getByRole("dialog", {
        name: "Change a recurring event",
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "This event" }).click();
    await expect(dialog).toBeHidden();
    await expect(
        eventById(column(stage, "2026-11-24"), "standup"),
    ).toContainText("10:00");
    await expect(
        eventById(column(stage, "2026-11-23"), "standup"),
    ).toContainText("9:00");
    // Monday's, to 08:30, for all of them
    await drag(
        page,
        await pointIn(
            eventById(column(stage, "2026-11-23"), "standup"),
            0.3,
            0.5,
        ),
        await pointIn(slot(stage, "2026-11-23", "08:30"), 0.3, 0.5),
    );
    await dialog.getByRole("button", { name: "All events" }).click();
    await expect(
        eventById(column(stage, "2026-11-27"), "standup"),
    ).toContainText("8:30");
});

test("the editor opens inside the site's frame", async ({ page }) => {
    const frame = await openHosted(page, { id: "team-planner" });
    await scrollTo(frame.locator("body"), "14:00");
    await select(page, frame.locator("body"), "2026-11-25", "16:00", "16:30");
    await expect(
        frame.getByRole("dialog", { name: "New event" }),
    ).toBeVisible();
});

// Overlay promotion (contract §5.4): with a host that promotes, the editor's modal covers the site's
// whole page. The frame goes over the page while the dialog is open, the example stays where it
// was (the embed pins its stage), and the frame goes back once the dialog has closed.
test("the editor's modal covers the site's page while it is open", async ({
    page,
}) => {
    const frame = await openHosted(page, { id: "team-planner", promote: "1" });
    const element = page.getByTestId("frame");
    const inline = await element.boundingBox();
    await scrollTo(frame.locator("body"), "14:00");
    await select(page, frame.locator("body"), "2026-11-25", "16:00", "16:30");
    const dialog = frame.getByRole("dialog", { name: "New event" });
    await expect(dialog).toBeVisible();
    await expect(element).toHaveAttribute("data-promoted", "");
    const viewport = page.viewportSize();
    await expect
        .poll(async () => {
            const box = await element.boundingBox();
            return box && [box.x, box.y, box.width, box.height];
        })
        .toEqual([0, 0, viewport?.width, viewport?.height]);
    // the example did not move: its stage is pinned where the frame was
    const stage = await frame.getByTestId("stage").boundingBox();
    expect(stage && inline && Math.abs(stage.x - inline.x)).toBeLessThanOrEqual(
        1,
    );
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(element).not.toHaveAttribute("data-promoted", "");
    const messages = await page.evaluate(
        () =>
            (
                window as unknown as {
                    messages: { type: string; open?: boolean }[];
                }
            ).messages,
    );
    expect(
        messages.filter((m) => m.type === "fragiola:example:overlay"),
    ).toEqual([
        expect.objectContaining({ open: true }),
        expect.objectContaining({ open: false }),
    ]);
});
