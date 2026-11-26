import { expect, type Locator, type Page, test } from "@playwright/test";

// The shell around the examples of examples/react: sidebar, theme, stage, source panel. The
// examples' own behaviour is covered by the shared e2e; this checks they render here.

const sidebar = (page: Page) =>
    page.getByRole("navigation", { name: "Playground" });

const colorOf = (locator: Locator) =>
    locator.evaluate((el) => getComputedStyle(el).backgroundColor);

async function openExample(page: Page, query: string) {
    await page.goto(`/?${query}`);
    const root = page
        .getByTestId("stage")
        .locator('[data-calendar-part="root"]')
        .first();
    await expect(root).toBeVisible();
    return root;
}

test("lists the examples, the scenarios and the fixtures, and opens an example", async ({
    page,
}) => {
    await page.goto("/");
    const nav = sidebar(page);
    await expect(nav.getByRole("heading", { name: "Examples" })).toBeVisible();
    await expect(nav.getByRole("heading", { name: "Scenarios" })).toBeVisible();
    await expect(nav.getByRole("heading", { name: "Fixtures" })).toBeVisible();
    await expect(
        nav.getByRole("link", { name: "Stress fixture" }),
    ).toHaveAttribute("href", "/fixtures/stress/");
    await nav.getByRole("link", { name: "Month", exact: true }).click();
    await expect(page).toHaveURL(/\?example=month$/);
    await expect(
        page.getByTestId("stage").getByRole("grid", { name: "Month" }),
    ).toBeVisible();
    await expect(page).toHaveTitle("Month · Calendar playground");
});

test("every example renders in the stage", async ({ page }) => {
    await page.goto("/");
    const hrefs = await sidebar(page)
        .getByRole("link")
        .evaluateAll((all) =>
            all
                .map((a) => a.getAttribute("href") ?? "")
                .filter((href) => href.includes("example=")),
        );
    expect(hrefs.length).toBe(25);
    for (const href of hrefs) {
        await page.goto(href);
        await expect(
            page
                .getByTestId("stage")
                .locator('[data-calendar-part="root"]')
                .first(),
        ).toBeVisible();
    }
});

test("switches the example theme live", async ({ page }) => {
    await openExample(page, "example=month");
    const grid = page.getByTestId("stage").getByRole("grid", { name: "Month" });
    const body = page.locator("body");
    await expect(body).toHaveAttribute("data-example-theme", "light");
    const light = await colorOf(grid);
    await page.getByRole("button", { name: "Dark" }).click();
    await expect(body).toHaveAttribute("data-example-theme", "dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect.poll(() => colorOf(grid)).not.toBe(light);
    await expect(page).toHaveURL(/theme=dark/);
});

test("shows the example's files in the source panel", async ({ page }) => {
    await openExample(page, "example=month");
    await page.getByRole("button", { name: "Source" }).click();
    const panel = page.getByRole("complementary", { name: "Source" });
    await expect(panel.getByTestId("source-path")).toHaveText(
        "examples/react/src/examples/month/index.tsx",
    );
    await expect(panel.locator("code")).toContainText(
        "export default function Month",
    );
});

test("names an unknown example instead of rendering nothing", async ({
    page,
}) => {
    await page.goto("/?example=nope");
    await expect(page.getByRole("main")).toContainText(
        "No example with id “nope”.",
    );
});
