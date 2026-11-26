// Pointer gestures through the adapter (D14): a drag moves a timed event by the time and the days
// under the pointer, a resize handle changes its end, a press on slots selects a range, a month's
// all-day event moves by days; each runs one command and reaches the root's callbacks. The engine
// writes `touch-action` on draggable events itself (D18): React never reconciles it away.
import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Calendar } from "../src";
import { dragAndDrop } from "../src/drag-and-drop";
import { resize } from "../src/resize";
import { selection } from "../src/selection";
import { allDay, MonthGrid, modelOf, TimeGridView, timed } from "./calendar";
import { drag } from "./interaction";

const FEATURES = [selection(), dragAndDrop(), resize()] as const;

function week() {
    const model = modelOf([timed("t", "09:00", "10:00")], {
        view: { type: "week", anchorDate: "2026-11-26" },
        features: FEATURES,
    });
    const onEventDrop = vi.fn();
    const onSelect = vi.fn();
    const onEventClick = vi.fn();
    const view = render(
        <Calendar.Root
            model={model}
            onEventDrop={onEventDrop}
            onSelect={onSelect}
            onEventClick={onEventClick}
        >
            <TimeGridView features />
        </Calendar.Root>,
    );
    const event = () =>
        view.container.querySelector<HTMLElement>(
            '[data-calendar-part="time-event"][data-occurrence-id="t"]',
        ) as HTMLElement;
    return { model, onEventDrop, onSelect, onEventClick, event, ...view };
}

describe("a pointer drag", () => {
    it("moves a timed event by an hour and a day", () => {
        const { model, onEventDrop, event } = week();
        expect(event().style.touchAction).toBe("none");
        drag(event(), 100, 60);
        expect(model.get("event-by", { id: "t" })).toMatchObject({
            start: "2026-11-27T10:00:00Z",
            end: "2026-11-27T11:00:00Z",
        });
        expect(onEventDrop).toHaveBeenCalledWith(
            expect.objectContaining({ kind: "move", keyboard: false }),
        );
        // the moved event's new element, in its new column, keeps the engine's style
        expect(
            event()
                .closest('[data-calendar-part="column"]')
                ?.getAttribute("data-date"),
        ).toBe("2026-11-27");
        expect(event().style.touchAction).toBe("none");
    });

    it("resizes a timed event from its end handle", () => {
        const { model, event } = week();
        const handle = event().querySelector(
            '[data-calendar-part="resize-handle"]',
        ) as HTMLElement;
        expect(handle.getAttribute("data-edge")).toBe("end");
        // the handle presses where its event is: half an hour below
        drag(handle, 0, 30);
        expect(model.get("event-by", { id: "t" })?.end).toBe(
            "2026-11-26T10:30:00Z",
        );
    });

    it("selects a range over slots, and a tap on an event is a click", () => {
        const { container, onSelect, onEventClick, event } = week();
        const slot = container.querySelector(
            '[data-calendar-part="slot"][data-date="2026-11-25"][data-time="13:00"]',
        ) as HTMLElement;
        drag(slot, 0, 60);
        expect(onSelect).toHaveBeenCalledWith(
            expect.objectContaining({
                range: {
                    start: "2026-11-25T13:00:00Z",
                    end: "2026-11-25T14:30:00Z",
                    allDay: false,
                },
            }),
        );
        // the highlight is drawn in its column, from the core's layout
        const highlight = container.querySelector<HTMLElement>(
            '[data-calendar-part="selection"]',
        );
        expect(
            highlight
                ?.closest('[data-calendar-part="column"]')
                ?.getAttribute("data-date"),
        ).toBe("2026-11-25");
        expect(Number.parseFloat(highlight?.style.top ?? "")).toBeCloseTo(
            (13 / 24) * 100,
        );
        drag(event(), 0, 0);
        expect(onEventClick).toHaveBeenCalledWith(
            expect.objectContaining({ eventId: "t", keyboard: false }),
        );
    });
});

describe("a month drag", () => {
    it("moves an all-day event by the days under the pointer", () => {
        const model = modelOf([allDay("a", "2026-11-24", "2026-11-25")], {
            view: { type: "month", anchorDate: "2026-11-26" },
            features: [dragAndDrop()],
        });
        const { container } = render(
            <Calendar.Root model={model}>
                <MonthGrid />
            </Calendar.Root>,
        );
        const segment = container.querySelector(
            '[data-calendar-part="segment"]',
        ) as HTMLElement;
        act(() => {});
        drag(segment, 200, 100);
        expect(model.get("event-by", { id: "a" })).toMatchObject({
            start: "2026-12-03",
            end: "2026-12-04",
        });
    });
});
