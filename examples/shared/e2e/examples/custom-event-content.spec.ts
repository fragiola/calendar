import { expect, test } from "@playwright/test";
import { column, openExample } from "../helpers";

// custom-event-content: events drawn from their typed data (kind, room, link, attendees, a
// cancelled state), inside the calendar's own event element.

test("draws each event from its kind and data", async ({ page }) => {
    const stage = await openExample(page, "custom-event-content");
    const planning = stage.getByRole("listitem", { name: "Sprint planning" });
    await expect(planning).toHaveAttribute("data-kind", "meeting");
    await expect(planning).toContainText("Atlas");
    await expect(planning).toContainText("10:00 – 11:30 AM");
    const call = stage.getByRole("listitem", { name: "Customer call" });
    await expect(call).toHaveAttribute("data-kind", "call");
    await expect(call).toContainText("meet.example.com/acme");
    await expect(
        column(stage, "2026-11-25").getByRole("listitem", {
            name: "Focus: billing API",
        }),
    ).toHaveAttribute("data-kind", "focus");
});

test("a cancelled event says so in its name", async ({ page }) => {
    const stage = await openExample(page, "custom-event-content");
    const design = column(stage, "2026-11-26").getByRole("listitem");
    await expect(design).toHaveAccessibleName("Design review (cancelled)");
});
