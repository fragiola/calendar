// The keyboard through the adapter (D12, D13): one tab stop over the grid's cells, arrows between
// slots and into the all-day row, Enter into a cell's events and Escape back, and a keyboard grab
// that moves an event (one `event.move`, `onEventDrop`).
import { act, render } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { Calendar } from "../src";
import { dragAndDrop } from "../src/drag-and-drop";
import { allDay, MonthGrid, modelOf, TimeGridView, timed } from "./calendar";
import { focused, key } from "./interaction";

function tabStop(container: HTMLElement): HTMLElement {
    const stops = container.querySelectorAll<HTMLElement>('[tabindex="0"]');
    expect(stops).toHaveLength(1);
    return stops[0] as HTMLElement;
}

describe("the keyboard in a time grid", () => {
    it("moves the one tab stop over slots and into the all-day row", () => {
        const model = modelOf([allDay("a", "2026-11-26", "2026-11-27")], {
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        const { container } = render(
            <Calendar.Root model={model}>
                <TimeGridView />
            </Calendar.Root>,
        );
        act(() => tabStop(container).focus());
        expect(focused()).toBe("slot 2026-11-26 00:00");
        key("ArrowDown");
        expect(focused()).toBe("slot 2026-11-26 00:30");
        key("ArrowRight");
        expect(focused()).toBe("slot 2026-11-27 00:30");
        key("ArrowUp");
        key("ArrowUp");
        expect(focused()).toBe("day 2026-11-27");
        key("ArrowLeft");
        // Enter moves into the day's events, Escape back to the cell
        key("Enter");
        expect(focused()).toBe("segment a");
        key("Escape");
        expect(focused()).toBe("day 2026-11-26");
        // the tab stop followed the focus
        expect(tabStop(container)).toBe(document.activeElement);
    });

    it("grabs an event with Space, moves it with the arrows, and drops it with Enter", () => {
        const model = modelOf([timed("t", "09:00", "10:00")], {
            view: { type: "week", anchorDate: "2026-11-26" },
            features: [dragAndDrop()],
        });
        const onEventDrop = vi.fn();
        const onAnnounce = vi.fn();
        const { container } = render(
            <Calendar.Root
                model={model}
                onEventDrop={onEventDrop}
                onAnnounce={onAnnounce}
            >
                <TimeGridView features />
            </Calendar.Root>,
        );
        const slot = container.querySelector<HTMLElement>(
            '[data-calendar-part="slot"][data-date="2026-11-26"][data-time="09:00"]',
        );
        act(() => slot?.focus());
        key("Enter");
        expect(focused()).toBe("time-event t");
        key(" ");
        const event = container.querySelector('[data-occurrence-id="t"]');
        expect(event?.hasAttribute("data-grabbed")).toBe(true);
        key("ArrowDown");
        // the preview shows where it would land, in its column
        const preview = container.querySelector<HTMLElement>(
            '[data-calendar-part="drag-preview"]',
        );
        expect(
            preview
                ?.closest('[data-calendar-part="column"]')
                ?.getAttribute("data-date"),
        ).toBe("2026-11-26");
        key("Enter");
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
            container.querySelector('[data-calendar-part="drag-preview"]'),
        ).toBeNull();
        // focus follows the moved event
        expect(focused()).toBe("time-event t");
    });
});

describe("the keyboard in a month", () => {
    it("moves by days and weeks, and pages by months", () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const { container } = render(
            <Calendar.Root model={model}>
                <MonthGrid />
            </Calendar.Root>,
        );
        act(() => tabStop(container).focus());
        expect(focused()).toBe("day 2026-11-26");
        key("ArrowDown");
        expect(focused()).toBe("day 2026-12-03");
        key("PageDown");
        expect(model.state.view.anchorDate.startsWith("2027-01")).toBe(true);
        expect(focused()).toBe("day 2027-01-03");
    });
});

describe("StrictMode", () => {
    it("runs on the engine of the second mount: keys and registrations work", () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const { container } = render(
            <React.StrictMode>
                <Calendar.Root model={model}>
                    <MonthGrid />
                </Calendar.Root>
            </React.StrictMode>,
        );
        act(() => tabStop(container).focus());
        key("ArrowRight");
        expect(focused()).toBe("day 2026-11-27");
        expect(tabStop(container)).toBe(document.activeElement);
    });
});
