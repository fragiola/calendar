// The next range reuses the time grid's cells (Epic #27), as packages/react's: the headers, the
// all-day days, the slots and the columns are keyed by their position, so Next gives the same
// elements their new dates. Each one is registered again under its new date: the keyboard, the tab
// stop and a press find it there.
import { fireEvent } from "@testing-library/dom";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { Calendar } from "../src";
import { selection } from "../src/selection";
import { allDay, modelOf, TimeGridView, Toolbar } from "./calendar";
import { drag, flush, focused, key } from "./interaction";

const cells = (container: Element) => [
    ...container.querySelectorAll<HTMLElement>(
        '[data-calendar-part="column-header"], [data-calendar-part="day"], [data-calendar-part="slot"], [data-calendar-part="column"]',
    ),
];

async function week(onSelect?: (event: unknown) => void) {
    const model = modelOf([allDay("a", "2026-11-26", "2026-11-27")], {
        view: { type: "week", anchorDate: "2026-11-26" },
        features: [selection()],
    });
    const wrapper = mount(
        () =>
            h(Calendar.Root, { model, onSelect }, () => [
                h(Toolbar),
                h(TimeGridView),
            ]),
        { attachTo: document.body },
    );
    await flush();
    return wrapper.element.parentElement as HTMLElement;
}

async function next(container: Element) {
    fireEvent.click(
        container.querySelector('[data-calendar-part="next"]') as Element,
    );
    await flush();
}

describe("Next in a time grid", () => {
    it("keeps the cells' elements, each with its new date", async () => {
        const container = await week();
        const before = cells(container);
        const dates = before.map((cell) => cell.getAttribute("data-date"));
        await next(container);
        const after = cells(container);
        expect(after).toHaveLength(before.length);
        for (const [index, cell] of after.entries()) {
            expect(cell).toBe(before[index]);
        }
        expect(after.map((cell) => cell.getAttribute("data-date"))).toEqual(
            dates.map((date) => {
                const later = new Date(`${date}T00:00:00Z`);
                later.setUTCDate(later.getUTCDate() + 7);
                return later.toISOString().slice(0, 10);
            }),
        );
        // one tab stop, on the new week's first slot
        const stops = container.querySelectorAll('[tabindex="0"]');
        expect(stops).toHaveLength(1);
        expect(stops[0]?.getAttribute("data-date")).toBe("2026-11-29");
    });

    it("moves the keyboard focus over the reused cells", async () => {
        const container = await week();
        (container.querySelector('[tabindex="0"]') as HTMLElement).focus();
        expect(focused()).toBe("slot 2026-11-26 00:00");
        await key("PageDown");
        expect(focused()).toBe("slot 2026-12-03 00:00");
        await key("ArrowRight");
        expect(focused()).toBe("slot 2026-12-04 00:00");
        await key("PageUp");
        await key("ArrowLeft");
        expect(focused()).toBe("slot 2026-11-26 00:00");
        expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    });

    it("selects from a reused slot at its new date", async () => {
        const onSelect = vi.fn();
        const container = await week(onSelect);
        await next(container);
        const slot = container.querySelector(
            '[data-calendar-part="slot"][data-date="2026-12-01"][data-time="13:00"]',
        ) as HTMLElement;
        await drag(slot, 0, 60);
        expect(onSelect).toHaveBeenCalledWith(
            expect.objectContaining({
                range: {
                    start: "2026-12-01T13:00:00Z",
                    end: "2026-12-01T14:30:00Z",
                    allDay: false,
                },
            }),
        );
    });
});
