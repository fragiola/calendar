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
