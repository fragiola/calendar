import { expect, test } from "@playwright/test";
import { column, eventById, eventNamed, openExample } from "../helpers";

// ai-commands: the command catalogue as tools, and a scripted assistant whose calls go through
// `model.dispatch`: valid ones change the calendar, a wrong one is refused with its reason.

test("lists the commands as tools, each with its JSON Schema", async ({
    page,
}) => {
    const stage = await openExample(page, "ai-commands");
    const tools = stage
        .getByRole("list", { name: "Tools" })
        .getByRole("listitem");
    expect(await tools.count()).toBeGreaterThan(10);
    await expect(tools.filter({ hasText: "event.move" })).toHaveCount(1);
    await tools
        .filter({ hasText: "event.move" })
        .getByText("event.move")
        .click();
    await expect(tools.filter({ hasText: "event.move" })).toContainText(
        '"eventId"',
    );
});

test("the assistant's plan runs through dispatch, and a wrong call is refused", async ({
    page,
}) => {
    const stage = await openExample(page, "ai-commands");
    await stage.getByRole("button", { name: "Plan my week" }).click();
    const calls = stage
        .getByRole("list", { name: "Tool calls" })
        .getByRole("listitem");
    await expect(calls).toHaveCount(5);
    await expect(calls.nth(0)).toContainText("→ ok");
    await expect(calls.nth(2)).toContainText("→ invalid_payload");
    await expect(
        eventNamed(column(stage, "2026-11-25"), "Focus: write the spec"),
    ).toBeAttached();
    await expect(eventById(stage, "sync")).toHaveCount(0);
});
