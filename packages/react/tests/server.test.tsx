// @vitest-environment node
// A server with no DOM at all renders every view: nothing reads a document or a window before
// the engine, which only a browser creates.
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Calendar } from "../src";
import { ListView, MonthGrid, modelOf, TimeGridView, timed } from "./calendar";

describe("a render in Node", () => {
    it("renders the month, week and list views", () => {
        for (const [type, view] of [
            ["month", <MonthGrid key="m" />],
            ["week", <TimeGridView key="w" />],
            ["list", <ListView key="l" />],
        ] as const) {
            const model = modelOf([timed("t", "09:00", "10:00")], {
                view: { type, anchorDate: "2026-11-26" },
            });
            const html = renderToString(
                <Calendar.Root model={model}>{view}</Calendar.Root>,
            );
            expect(html).toContain(`data-view="${type}"`);
            expect(html).toContain('data-event-id="t"');
        }
    });
});
