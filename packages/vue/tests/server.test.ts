// @vitest-environment node
// A server with no DOM at all renders every view: nothing reads a document or a window before
// the engine, which only a browser creates; and the render neither subscribes to the model nor
// runs a command on it (a model may be shared by other requests).
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { Calendar } from "../src";
import { ListView, MonthGrid, modelOf, TimeGridView, timed } from "./calendar";

describe("a render in Node", () => {
    it("renders the month, week and list views", async () => {
        for (const [type, view] of [
            ["month", MonthGrid],
            ["week", TimeGridView],
            ["list", ListView],
        ] as const) {
            const model = modelOf([timed("t", "09:00", "10:00")], {
                view: { type, anchorDate: "2026-11-26" },
            });
            const subscribe = vi.spyOn(model, "subscribe");
            const run = vi.spyOn(model, "run");
            const html = await renderToString(
                createSSRApp({
                    render: () =>
                        h(
                            Calendar.Root,
                            { model, view: type === "month" ? "week" : type },
                            () => h(view),
                        ),
                }),
            );
            expect(html).toContain(`data-view="${type}"`);
            expect(html).toContain('data-event-id="t"');
            expect(subscribe).not.toHaveBeenCalled();
            expect(run).not.toHaveBeenCalled();
        }
    });
});
