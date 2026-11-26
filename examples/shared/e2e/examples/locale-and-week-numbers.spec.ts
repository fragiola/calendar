import { expect, test } from "@playwright/test";
import { grid, openExample } from "../helpers";

// locale-and-week-numbers: the locale changes the first day, the names and the title; the rule
// changes the week numbers.

const firstHeader = (stage: ReturnType<typeof grid>) =>
    stage.getByRole("columnheader").first();

test("English (US): Sunday first, the locale's week numbers", async ({
    page,
}) => {
    const stage = await openExample(page, "locale-and-week-numbers");
    const month = grid(stage, "Month");
    await expect(
        stage.getByRole("heading", { name: "November 2026" }),
    ).toBeVisible();
    await expect(firstHeader(month)).toHaveText("Sun");
    await expect(firstHeader(month)).toHaveAttribute("data-date", "2026-11-01");
    // the row of 2026-11-22: week 48 of the US rule
    const row = month
        .getByRole("row")
        .filter({ has: page.locator('[data-date="2026-11-26"]') });
    await expect(row.getByRole("rowheader")).toHaveText("48");
});

test("Deutsch: Monday first, German names, ISO week numbers", async ({
    page,
}) => {
    const stage = await openExample(page, "locale-and-week-numbers");
    await stage.getByRole("radio", { name: "Deutsch" }).click();
    const month = grid(stage, "Month");
    await expect(
        stage.getByRole("heading", { name: "November 2026" }),
    ).toBeVisible();
    await expect(firstHeader(month)).toHaveText("Mo");
    await expect(firstHeader(month)).toHaveAttribute("data-date", "2026-10-26");
    const row = month
        .getByRole("row")
        .filter({ has: page.locator('[data-date="2026-11-26"]') });
    await expect(row.getByRole("rowheader")).toHaveText("48");
});

test("日本語: the title in Japanese; ISO weeks number each row by its middle day", async ({
    page,
}) => {
    const stage = await openExample(page, "locale-and-week-numbers");
    await stage.getByRole("radio", { name: "日本語" }).click();
    await expect(
        stage.getByRole("heading", { name: "2026年11月" }),
    ).toBeVisible();
    await stage.getByRole("radio", { name: "English (US)" }).click();
    await stage.getByRole("radio", { name: "ISO weeks" }).click();
    const month = grid(stage, "Month");
    // the row from Sunday 2026-11-01: its middle day, Wednesday the 4th, is ISO week 45
    const row = month
        .getByRole("row")
        .filter({ has: page.locator('[data-date="2026-11-01"]') });
    await expect(row.getByRole("rowheader")).toHaveText("45");
});
