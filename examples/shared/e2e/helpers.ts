import {
    expect,
    type FrameLocator,
    type Locator,
    type Page,
    test,
} from "@playwright/test";
import { examplesApp, listExampleSlugs } from "../scripts/examples-lib.ts";
import { THEMES, type ThemeName } from "../src/themes/themes.ts";
import { embedBase, frameworkOf, skipOrFail } from "./available.ts";

// The examples run in a framework's embed app, addressed by its directory URL (`…/?id=`, §5.1 of
// the site export contract), alone on the page: the stage is the page's own `data-testid="stage"`,
// and the site's Reset (which reloads the iframe) is a reload.
//
// Every framework runs these specs (config.ts). They reach the examples only through what every
// adapter reproduces: `data-calendar-part`, `data-date`, `data-time`, roles and accessible names,
// `data-*` state and test ids the example sets itself; never a class name or a framework detail.
//
// The clock is fixed (Thursday 2026-11-26, 12:00 in New York, the browser's zone: config.ts), so
// the examples' "today" and their demo weeks never depend on the day the suite runs.

/** The framework under test, set by the app's playwright.config.ts. */
export const FRAMEWORK = frameworkOf(process.env.EXAMPLES_FRAMEWORK);
/** Where the e2e server mounts its embed (serve.ts). */
export const EMBED_BASE = embedBase(FRAMEWORK);
const AVAILABLE = listExampleSlugs(examplesApp(FRAMEWORK));
/** The framework's examples: a spec loops over these, never over a fixed list. */
export const EXAMPLES = AVAILABLE.map((slug) => ({ slug }));
export { THEMES };

/** The specs' "now": Thursday 2026-11-26, 12:00 in New York. */
export const NOW = "2026-11-26T12:00:00-05:00";

/** The root of a calendar: `data-calendar-part="root"`. */
export const ROOT = '[data-calendar-part="root"]';

/**
 * Skips the running test (or, at the top of a spec file, the whole file) when the framework has
 * not every one of these examples: a framework may ship a subset of them. A complete framework
 * fails instead.
 */
export function requireExamples(...slugs: string[]) {
    const reason = skipOrFail(FRAMEWORK, AVAILABLE, slugs);
    test.skip(reason !== undefined, reason);
}

/** Fixes the page's clock at {@link NOW} (timers keep running), before it loads. */
export async function fixClock(page: Page) {
    await page.clock.setFixedTime(new Date(NOW));
}

/**
 * Opens an example in a theme and waits for its calendar to mount, on the fixed clock. Skips the
 * test when the framework has no such example.
 */
export async function openExample(
    page: Page,
    slug: string,
    options: { theme?: ThemeName } = {},
) {
    requireExamples(slug);
    await fixClock(page);
    const params = new URLSearchParams({ id: slug });
    if (options.theme) params.set("theme", options.theme);
    await page.goto(`./?${params}`);
    const stage = page.getByTestId("stage");
    if (options.theme) {
        await expect(page.locator("body")).toHaveAttribute(
            "data-example-theme",
            options.theme,
        );
    }
    await expect(stage.locator(ROOT).first()).toBeVisible();
    // the engine attaches in a layout effect: the grid's tab stop is its first write
    await expect(
        stage.locator(`${ROOT} [tabindex="0"]`).first(),
    ).toBeAttached();
    return stage;
}

/**
 * Opens an example as fragiola.com shows it: in an iframe of a same-origin page (serve.ts,
 * /host.html; `promote: "1"`: a host that promotes the frame over its page while a modal overlay
 * is open). Skips the test when the framework has no such example.
 */
export async function openHosted(
    page: Page,
    query: { id: string; theme?: string; promote?: "1" },
): Promise<FrameLocator> {
    requireExamples(query.id);
    await fixClock(page);
    await page.goto(`/host.html?${new URLSearchParams(query)}`);
    const frame = page.frameLocator('[data-testid="frame"]');
    await expect(frame.locator(ROOT).first()).toBeVisible();
    return frame;
}

/** The site's Reset: it reloads the example's frame. */
export async function reset(page: Page) {
    await page.reload();
    await expect(page.getByTestId("stage").locator(ROOT).first()).toBeVisible();
}

/** Collects console errors and uncaught exceptions for the page's lifetime. */
export function collectErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(String(error)));
    return errors;
}

/** The first calendar grid of a scope (a month's or a time grid's), or the one with this name. */
export function grid(
    scope: Page | FrameLocator | Locator,
    name?: string,
): Locator {
    return name === undefined
        ? scope.getByRole("grid").first()
        : scope.getByRole("grid", { name });
}

/** A day of a day grid (a month's day, an all-day cell). */
export const day = (scope: Page | FrameLocator | Locator, date: string) =>
    scope.locator(`[data-calendar-part="day"][data-date="${date}"]`);

/** A time-grid slot. */
export const slot = (
    scope: Page | FrameLocator | Locator,
    date: string,
    time: string,
) =>
    scope.locator(
        `[data-calendar-part="slot"][data-date="${date}"][data-time="${time}"]`,
    );

/** A time-grid column (a day's layer over the slots). */
export const column = (scope: Page | FrameLocator | Locator, date: string) =>
    scope.locator(`[data-calendar-part="column"][data-date="${date}"]`);

/** An event's element(s), by the event's id (a series or a multi-week event has several). */
export const eventById = (
    scope: Page | FrameLocator | Locator,
    eventId: string,
) => scope.locator(`[data-event-id="${eventId}"][role="listitem"]`);

/** An event by its accessible name (its title, as the example renders it). */
export const eventNamed = (
    scope: Page | FrameLocator | Locator,
    name: string | RegExp,
) => scope.getByRole("listitem").filter({ hasText: name });

/** The element that has DOM focus: its part, date, time and occurrence id. */
export function focused(page: Page) {
    return page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        return {
            part: element?.dataset.calendarPart,
            date: element?.dataset.date,
            time: element?.dataset.time,
            occurrenceId: element?.dataset.occurrenceId,
        };
    });
}

/** Scrolls a time grid so that `time` (`HH:mm`) is its first visible slot. */
export async function scrollTo(scope: Page | Locator, time: string) {
    await scope
        .locator(`[data-calendar-part="slot-row"][data-time="${time}"]`)
        .first()
        .evaluate((element) => {
            const scroller = element.closest<HTMLElement>(
                '[data-calendar-part="scroller"]',
            );
            if (scroller) {
                scroller.scrollTop +=
                    element.getBoundingClientRect().top -
                    scroller.getBoundingClientRect().top;
            }
        });
}

/** A point in a locator's box, at fractions of its width and height. */
export async function pointIn(locator: Locator, x = 0.5, y = 0.5) {
    const box = await locator.boundingBox();
    if (!box) throw new Error("no bounding box");
    return { x: box.x + box.width * x, y: box.y + box.height * y };
}

/** A mouse drag between two points, in steps, past the drag threshold. */
export async function drag(
    page: Page,
    from: { x: number; y: number },
    to: { x: number; y: number },
) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 8, from.y + 8, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.up();
}
