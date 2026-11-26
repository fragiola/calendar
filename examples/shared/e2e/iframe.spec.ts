import { expect, type Page, test } from "@playwright/test";
import {
    collectErrors,
    column,
    drag,
    EXAMPLES,
    eventById,
    grid,
    openHosted,
    pointIn,
    scrollTo,
    slot,
} from "./helpers";

// The examples as fragiola.com shows them: in an iframe of a same-origin page (e2e/serve.ts,
// /host.html), talking to it with the site export's messages (contract v1.7, §5.2).

interface Message {
    type: string;
    id?: string;
    height?: number;
}

const messages = (page: Page) =>
    page.evaluate(
        () => (window as unknown as { messages: Message[] }).messages,
    );

test("the embed says ready once, with no resize for a fill layout", async ({
    page,
}) => {
    await openHosted(page, { id: "month", theme: "dark" });
    await expect
        .poll(() => messages(page))
        .toContainEqual({ type: "fragiola:example:ready", id: "month" });
    await expect(page.getByTestId("frame")).toHaveCSS("opacity", "1");
    await page.waitForTimeout(300);
    expect(await messages(page)).toEqual([
        { type: "fragiola:example:ready", id: "month" },
    ]);
});

test("the theme is applied before the first paint, and follows the site's message", async ({
    page,
}) => {
    const frame = await openHosted(page, { id: "month", theme: "light" });
    const body = frame.locator("body");
    const html = frame.locator("html");
    await expect(body).toHaveAttribute("data-example-theme", "light");
    await expect(html).toHaveAttribute("data-theme", "light");
    await expect(html).toHaveCSS("color-scheme", "light");
    const floor = () =>
        grid(frame).evaluate((el) => getComputedStyle(el).backgroundColor);
    const before = await floor();

    const send = (theme: string) =>
        page.evaluate((theme) => {
            document
                .querySelector("iframe")
                ?.contentWindow?.postMessage(
                    { type: "fragiola:example:theme", theme },
                    location.origin,
                );
        }, theme);
    await send("dark");
    await expect(body).toHaveAttribute("data-example-theme", "dark");
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(html).toHaveClass(/\bdark\b/);
    await expect(html).toHaveCSS("color-scheme", "dark");
    await expect.poll(floor).not.toBe(before);

    // an unknown theme is ignored
    await send("nope");
    await page.waitForTimeout(100);
    await expect(body).toHaveAttribute("data-example-theme", "dark");
});

test("a missing or unknown theme falls back to light", async ({ page }) => {
    for (const query of [{ id: "month" }, { id: "month", theme: "nope" }]) {
        const frame = await openHosted(page, query);
        await expect(frame.locator("body")).toHaveAttribute(
            "data-example-theme",
            "light",
        );
    }
});

test("an unknown example says so, and is still ready", async ({ page }) => {
    await page.goto("/host.html?id=nope");
    const frame = page.frameLocator('[data-testid="frame"]');
    await expect(frame.getByRole("alert")).toHaveText('Unknown example "nope"');
    await expect
        .poll(() => messages(page))
        .toContainEqual({ type: "fragiola:example:ready", id: "nope" });
});

for (const { slug } of EXAMPLES) {
    test(`${slug} runs in a frame`, async ({ page }) => {
        const errors = collectErrors(page);
        await openHosted(page, { id: slug, theme: "dark" });
        await expect
            .poll(() => messages(page))
            .toContainEqual({ type: "fragiola:example:ready", id: slug });
        expect(errors).toEqual([]);
    });
}

test("the keyboard and a pointer drag work inside the frame", async ({
    page,
}) => {
    const frame = await openHosted(page, { id: "month" });
    // the grid's one tab stop is today; the arrows move it
    await frame.locator('[data-calendar-part="day"][tabindex="0"]').focus();
    await page.keyboard.press("ArrowRight");
    await expect(frame.locator(":focus")).toHaveAttribute(
        "data-date",
        "2026-11-27",
    );
    // drag-and-resize: Monday's sprint planning dragged to Tuesday at the same time
    const hosted = await openHosted(page, { id: "drag-and-resize" });
    await scrollTo(hosted.locator("body"), "08:00");
    await drag(
        page,
        await pointIn(eventById(hosted, "planning"), 0.5, 0.2),
        await pointIn(slot(hosted, "2026-11-24", "10:00"), 0.5, 0.2),
    );
    await expect(
        eventById(column(hosted, "2026-11-24"), "planning"),
    ).toBeVisible();
});
