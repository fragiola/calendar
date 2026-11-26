// The keyboard through the adapter (D12, D13), as packages/react's: one tab stop over the grid's
// cells, arrows between slots and into the all-day row, Enter into a cell's events and Escape
// back, and a keyboard grab that moves an event (one `event.move`, `@event-drop`).
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { Calendar } from "../src";
import { dragAndDrop } from "../src/drag-and-drop";
import { allDay, MonthGrid, modelOf, TimeGridView, timed } from "./calendar";
import { flush, focused, key } from "./interaction";

function tabStop(container: Element): HTMLElement {
    const stops = container.querySelectorAll<HTMLElement>('[tabindex="0"]');
    expect(stops).toHaveLength(1);
    return stops[0] as HTMLElement;
}

describe("the keyboard in a time grid", () => {
    it("moves the one tab stop over slots and into the all-day row", async () => {
        const model = modelOf([allDay("a", "2026-11-26", "2026-11-27")], {
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        const wrapper = mount(
            () => h(Calendar.Root, { model }, () => h(TimeGridView)),
            { attachTo: document.body },
        );
        await flush();
        tabStop(wrapper.element).focus();
        expect(focused()).toBe("slot 2026-11-26 00:00");
        await key("ArrowDown");
        expect(focused()).toBe("slot 2026-11-26 00:30");
        await key("ArrowRight");
        expect(focused()).toBe("slot 2026-11-27 00:30");
        await key("ArrowUp");
        await key("ArrowUp");
        expect(focused()).toBe("day 2026-11-27");
        await key("ArrowLeft");
        // Enter moves into the day's events, Escape back to the cell
        await key("Enter");
        expect(focused()).toBe("segment a");
        await key("Escape");
        expect(focused()).toBe("day 2026-11-26");
        // the tab stop followed the focus
        expect(tabStop(wrapper.element)).toBe(document.activeElement);
    });

    it("grabs an event with Space, moves it with the arrows, and drops it with Enter", async () => {
        const model = modelOf([timed("t", "09:00", "10:00")], {
            view: { type: "week", anchorDate: "2026-11-26" },
            features: [dragAndDrop()],
        });
        const onEventDrop = vi.fn();
        const onAnnounce = vi.fn();
        const wrapper = mount(
            () =>
                h(Calendar.Root, { model, onEventDrop, onAnnounce }, () =>
                    h(TimeGridView, { features: true }),
                ),
            { attachTo: document.body },
        );
        await flush();
        const slot = (wrapper.element as Element).querySelector<HTMLElement>(
            '[data-calendar-part="slot"][data-date="2026-11-26"][data-time="09:00"]',
        );
        slot?.focus();
        await key("Enter");
        expect(focused()).toBe("time-event t");
        await key(" ");
        const event = wrapper.element.querySelector('[data-occurrence-id="t"]');
        expect(event?.hasAttribute("data-grabbed")).toBe(true);
        await key("ArrowDown");
        // the preview shows where it would land, in its column
        const preview = (wrapper.element as Element).querySelector<HTMLElement>(
            '[data-calendar-part="drag-preview"]',
        );
        expect(
            preview
                ?.closest('[data-calendar-part="column"]')
                ?.getAttribute("data-date"),
        ).toBe("2026-11-26");
        await key("Enter");
        expect(model.get("event-by", { id: "t" })?.start).toBe(
            "2026-11-26T09:30:00Z",
        );
        expect(onEventDrop).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: "move",
                eventId: "t",
                keyboard: true,
            }),
        );
        expect(onAnnounce).toHaveBeenCalled();
        expect(
            wrapper.element.querySelector(
                '[data-calendar-part="drag-preview"]',
            ),
        ).toBeNull();
        // focus follows the moved event
        expect(focused()).toBe("time-event t");
    });
});

describe("the keyboard in a month", () => {
    it("moves by days and weeks, and pages by months", async () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const wrapper = mount(
            () => h(Calendar.Root, { model }, () => h(MonthGrid)),
            { attachTo: document.body },
        );
        await flush();
        tabStop(wrapper.element).focus();
        expect(focused()).toBe("day 2026-11-26");
        await key("ArrowDown");
        expect(focused()).toBe("day 2026-12-03");
        await key("PageDown");
        expect(model.state.view.anchorDate.startsWith("2027-01")).toBe(true);
        expect(focused()).toBe("day 2027-01-03");
    });
});
