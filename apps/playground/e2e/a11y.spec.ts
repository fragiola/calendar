import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openFixture } from "./helpers";

// The event-calendar pattern (D12, AGENTS.md "Issue #8, accessibility"): axe finds no violation in
// any view, with events in every part (all-day, multi-day, overlapping timed events, "+N more").
// Run on the bare fixture (no feature) and on the interaction fixture (every feature's parts).

const VIEWS = ["month", "week", "day", "list"] as const;

for (const fixture of ["bare", "interaction", "more"] as const) {
    for (const view of VIEWS) {
        test(`${fixture}: axe finds no violation in the ${view} view`, async ({
            page,
        }) => {
            await openFixture(page, fixture, { view });
            const results = await new AxeBuilder({ page })
                .include('[data-calendar-part="root"]')
                .analyze();
            expect(
                results.violations.map(
                    (violation) =>
                        `${violation.id}: ${violation.nodes
                            .slice(0, 3)
                            .map((node) => node.target.join(" "))
                            .join(", ")}`,
                ),
            ).toEqual([]);
        });
    }
}

// A month whose rows render their week number (`?weeks=1`, the root's `weekNumberColumn`): the
// grid counts that column, so the header row of seven and the rows of eight agree.
test("bare: axe finds no violation in a month with week numbers, its columns numbered", async ({
    page,
}) => {
    await openFixture(page, "bare", { view: "month", weeks: "1" });
    const grid = page.getByRole("grid", { name: "Month" });
    await expect(grid).toHaveAttribute("aria-colcount", "8");
    const row = grid
        .getByRole("row")
        .filter({ has: page.locator('[data-date="2026-11-26"]') });
    await expect(row.getByRole("rowheader")).toHaveAttribute(
        "aria-colindex",
        "1",
    );
    await expect(row.getByRole("gridcell").last()).toHaveAttribute(
        "aria-colindex",
        "8",
    );
    await expect(grid.getByRole("columnheader").first()).toHaveAttribute(
        "aria-colindex",
        "2",
    );
    const results = await new AxeBuilder({ page })
        .include('[data-calendar-part="root"]')
        .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
});
