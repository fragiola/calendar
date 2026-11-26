// A server render (`@vue/server-renderer`) is the first client render (no hydration mismatch)
// for the month, week and list views, as packages/react's: before the engine exists, the parts'
// attributes are the core's `partAttributes`, the tab stop where the model puts it; once the
// engine runs they stay the same until something is focused.
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { Calendar, type ViewType } from "../src";
import { nowIndicator } from "../src/now-indicator";
import { selection } from "../src/selection";
import {
    allDay,
    ListView,
    MonthGrid,
    modelOf,
    TimeGridView,
    timed,
} from "./calendar";
import { flush } from "./interaction";

const EVENTS = [
    allDay("a", "2026-11-24", "2026-11-27"),
    timed("t", "09:00", "10:00"),
    timed("u", "09:30", "11:00"),
];

function app(type: ViewType) {
    const model = modelOf(EVENTS, {
        view: { type, anchorDate: "2026-11-26" },
        features: [selection(), nowIndicator()],
    });
    const view =
        type === "month"
            ? MonthGrid
            : type === "list"
              ? ListView
              : TimeGridView;
    return createSSRApp({
        render: () =>
            h(Calendar.Root, { model, weekNumberColumn: true }, () => h(view)),
    });
}

/**
 * Every element's tag and attributes, in order, its style as the DOM reads it (each
 * declaration, in any order: Vue writes a patched style back in the DOM's form and order).
 */
function shape(root: Element): string[] {
    return [...root.querySelectorAll("*")].map((element) => {
        const attributes = element
            .getAttributeNames()
            .sort()
            .map((name) =>
                name === "style"
                    ? `style=${[...(element as HTMLElement).style]
                          .map(
                              (property) =>
                                  `${property}:${(element as HTMLElement).style.getPropertyValue(property)}`,
                          )
                          .sort()
                          .join(";")}`
                    : `${name}=${element.getAttribute(name)}`,
            );
        return `${element.tagName} ${attributes.join(" ")}`;
    });
}

describe("a server render", () => {
    for (const type of ["month", "week", "list"] as const) {
        it(`${type}: hydrates with no mismatch, and the engine's attributes match it`, async () => {
            const html = await renderToString(app(type));
            expect(html).toContain('data-calendar-part="root"');
            const container = document.createElement("div");
            container.innerHTML = html;
            document.body.append(container);
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            const error = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});
            const client = app(type);
            client.mount(container);
            await flush();
            expect(warn).not.toHaveBeenCalled();
            expect(error).not.toHaveBeenCalled();
            warn.mockRestore();
            error.mockRestore();
            // the engine attached: what it renders is what the server rendered
            const parsed = document.createElement("div");
            parsed.innerHTML = html;
            expect(shape(container)).toEqual(shape(parsed));
            client.unmount();
            container.remove();
        });
    }

    it("hydrates the model's state, and applies a controlled prop that differs once mounted", async () => {
        // the server and the client each load the same document; the controlled date is another
        // month: the server shows the model's, so the client hydrates it first (React's layout
        // effect), then goes to the controlled date
        const controlled = () =>
            createSSRApp({
                render: () =>
                    h(
                        Calendar.Root,
                        {
                            model: modelOf(EVENTS, {
                                view: {
                                    type: "month",
                                    anchorDate: "2026-11-26",
                                },
                            }),
                            date: "2027-01-15",
                            weekNumberColumn: true,
                        },
                        () => h(MonthGrid),
                    ),
            });
        const html = await renderToString(controlled());
        expect(html).toContain('data-date="2026-11-26"');
        const container = document.createElement("div");
        container.innerHTML = html;
        document.body.append(container);
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const client = controlled();
        client.mount(container);
        await flush();
        expect(warn).not.toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
        warn.mockRestore();
        error.mockRestore();
        expect(
            container.querySelector(
                '[data-calendar-part="day"][data-date="2027-01-15"]',
            ),
        ).not.toBeNull();
        client.unmount();
        container.remove();
    });

    it("has the grid's roles, its ARIA and its one tab stop before any engine", async () => {
        const html = await renderToString(app("week"));
        expect(html).toContain('role="grid"');
        expect(html).toContain('aria-multiselectable="true"');
        expect(html).toContain('aria-colcount="8"');
        expect(html.match(/tabindex="0"/g)).toHaveLength(1);
        expect(html).toMatch(
            /data-calendar-part="slot"[^>]*data-date="2026-11-26"[^>]*data-time="00:00"[^>]*tabindex="0"|tabindex="0"[^>]*data-calendar-part="slot"/,
        );
    });
});
