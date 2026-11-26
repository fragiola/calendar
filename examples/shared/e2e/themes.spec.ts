import { expect, type Page, test } from "@playwright/test";
import { grid, openExample, slot, THEMES } from "./helpers";

// The example themes (examples/shared/src/themes) are values every framework's examples read, so
// their checks run against each framework's embed: checked on computed styles (verify by
// compiling, not by reading class names).
//
// The themes change shape, not only colour: a slot's height, a lane's height, the radii, the font,
// and the calendar's own shapes (the grid lines' style, today's marker, the headers' case). That
// is what shows a reader the package is headless: every look is the app's.

type ThemeName = (typeof THEMES)[number]["name"];

/** The shapes of the week example: a slot, an event's box, the grid, a header, the all-day lane. */
async function shapes(page: Page) {
    const nine = slot(page, "2026-11-26", "09:00");
    // the box the example draws inside each timed event (its test id)
    const event = page
        .locator('[data-calendar-part="time-event"]')
        .getByTestId("event-box")
        .first();
    const header = page.locator('[data-calendar-part="column-header"]').first();
    const lane = page
        .locator(
            '[data-calendar-part="all-day-row"] [data-calendar-part="segment"]',
        )
        .first();
    return {
        slot: (await nine.boundingBox())?.height,
        lane: (await lane.boundingBox())?.height,
        radius: await event.evaluate(
            (el) => getComputedStyle(el).borderTopLeftRadius,
        ),
        font: await grid(page).evaluate(
            (el) => getComputedStyle(el).fontFamily,
        ),
        line: await nine.evaluate((el) => getComputedStyle(el).borderTopStyle),
        header: await header.evaluate(
            (el) => getComputedStyle(el).textTransform,
        ),
    };
}

async function look(page: Page, theme: ThemeName) {
    await openExample(page, "week", { theme });
    return shapes(page);
}

for (const theme of THEMES) {
    test(`${theme.name} loads, and its scheme reaches the page`, async ({
        page,
    }) => {
        await openExample(page, "month", { theme: theme.name });
        await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme.scheme,
        );
        expect(
            await grid(page).evaluate((el) => getComputedStyle(el).colorScheme),
        ).toBe(theme.scheme);
    });
}

test("light and dark paint different grids with the same shapes", async ({
    page,
}) => {
    const paint = async (theme: "light" | "dark") => {
        await openExample(page, "week", { theme });
        return {
            color: await grid(page).evaluate(
                (el) => getComputedStyle(el).backgroundColor,
            ),
            shapes: await shapes(page),
        };
    };
    const light = await paint("light");
    const dark = await paint("dark");
    expect(light.color).not.toBe(dark.color);
    expect(dark.shapes).toEqual(light.shapes);
});

test("ide: short slots, uppercase headers, square events", async ({ page }) => {
    const s = await look(page, "ide");
    expect(s.slot).toBe(24);
    expect(s.header).toBe("uppercase");
    expect(s.radius).toBe("2px");
});

test("paper: tall slots, rounded events, dotted lines, a serif face", async ({
    page,
}) => {
    const s = await look(page, "paper");
    expect(s.slot).toBe(48);
    expect(Number.parseFloat(s.radius)).toBeGreaterThan(6);
    expect(s.line).toBe("dotted");
    expect(s.font).toMatch(/serif|Georgia|Palatino/i);
});

test("terminal: monospace, square events, dashed lines", async ({ page }) => {
    const s = await look(page, "terminal");
    expect(s.radius).toBe("0px");
    expect(s.line).toBe("dashed");
    expect(s.font).toMatch(/mono|Menlo|Consolas/i);
});

test("ide, paper and terminal differ from light in shape, not only colour", async ({
    page,
}) => {
    const light = await look(page, "light");
    expect(light.line).toBe("solid");
    for (const theme of ["ide", "paper", "terminal"] as const) {
        const s = await look(page, theme);
        expect(s.slot, theme).not.toBe(light.slot);
        expect(s.lane, theme).not.toBe(light.lane);
        expect(s.radius, theme).not.toBe(light.radius);
        expect(s.font, theme).not.toBe(light.font);
    }
});
