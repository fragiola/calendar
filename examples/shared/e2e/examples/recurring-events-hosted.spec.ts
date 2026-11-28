import { expect, type FrameLocator, type Page, test } from "@playwright/test";
import {
    column,
    drag,
    eventNamed,
    hostedFrame,
    openHosted,
    pointIn,
    scrollTo,
    slot,
} from "../helpers";

// recurring-events in a host that says it can promote and never does (serve.ts, `promote=mute`):
// the scope dialog the drop opens from code is held unseen while the embed waits for `promoted`,
// then let go in place after its 300 ms. It ends up seen, with the keyboard focus in it, and a
// dialog closed while it was held sends `overlay` closed: the frame is never left promoted over
// nothing.

const overlayMessages = (page: Page) =>
    page.evaluate(() =>
        (
            window as unknown as {
                messages: { type: string; open?: boolean }[];
            }
        ).messages.filter((m) => m.type === "fragiola:example:overlay"),
    );

async function dropStandup(page: Page, frame: FrameLocator) {
    const stage = frame.locator("body");
    await scrollTo(stage, "08:00");
    await drag(
        page,
        await pointIn(eventNamed(column(stage, "2026-11-25"), "Standup")),
        await pointIn(slot(stage, "2026-11-25", "10:00")),
    );
}

test("with no promotion, the scope dialog shows in place, the keyboard in it", async ({
    page,
}) => {
    const frame = await openHosted(page, {
        id: "recurring-events",
        promote: "mute",
    });
    await dropStandup(page, frame);
    const dialog = frame.getByRole("dialog", { name: "Edit recurring event" });
    await expect(dialog).toBeVisible();
    // let go: its portal opaque again, and the focus it took as it mounted kept
    await expect
        .poll(() =>
            dialog.evaluate((element) => {
                let opacity = 1;
                for (
                    let at: Element | null = element;
                    at;
                    at = at.parentElement
                ) {
                    opacity *= Number(getComputedStyle(at).opacity);
                }
                return opacity;
            }),
        )
        .toBe(1);
    expect(
        await dialog.evaluate((element) =>
            element.contains(element.ownerDocument.activeElement),
        ),
    ).toBe(true);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect
        .poll(() => overlayMessages(page))
        .toEqual([
            expect.objectContaining({ open: true }),
            expect.objectContaining({ open: false }),
        ]);
});

test("a scope dialog closed while it is held sends overlay closed", async ({
    page,
}) => {
    const frame = await openHosted(page, {
        id: "recurring-events",
        promote: "mute",
    });
    // within the hold: Escape once the dialog has mounted and taken the focus (unseen); its exit
    // waits for its held opening, and the frame goes back once its portal is gone
    await dropStandup(page, frame);
    await hostedFrame(page).waitForFunction(
        () =>
            document
                .querySelector('[role="dialog"]')
                ?.contains(document.activeElement) === true,
        undefined,
        { polling: "raf" },
    );
    await page.keyboard.press("Escape");
    await expect(frame.locator('[role="dialog"]')).toHaveCount(0);
    await expect
        .poll(() => overlayMessages(page))
        .toEqual([
            expect.objectContaining({ open: true }),
            expect.objectContaining({ open: false }),
        ]);
});
