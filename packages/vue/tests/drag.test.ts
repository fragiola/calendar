// Pointer gestures through the adapter (D14), as packages/react's: a drag moves a timed event by
// the time and the days under the pointer, a resize handle changes its end, a press on slots
// selects a range, a month's all-day event moves by days; each runs one command and reaches the
// root's events. The engine writes `touch-action` on draggable events itself (D18): Vue never
// patches it away.
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { Calendar } from "../src";
import { dragAndDrop } from "../src/drag-and-drop";
import { resize } from "../src/resize";
import { selection } from "../src/selection";
import { allDay, MonthGrid, modelOf, TimeGridView, timed } from "./calendar";
import { drag, flush } from "./interaction";

const FEATURES = [selection(), dragAndDrop(), resize()] as const;

async function week() {
    const model = modelOf([timed("t", "09:00", "10:00")], {
        view: { type: "week", anchorDate: "2026-11-26" },
        features: FEATURES,
    });
    const onEventDrop = vi.fn();
    const onSelect = vi.fn();
    const onEventClick = vi.fn();
    const wrapper = mount(
        () =>
            h(
                Calendar.Root,
                { model, onEventDrop, onSelect, onEventClick },
                () => h(TimeGridView, { features: true }),
            ),
        { attachTo: document.body },
    );
    await flush();
    const container = wrapper.element.parentElement as HTMLElement;
    const event = () =>
        container.querySelector<HTMLElement>(
            '[data-calendar-part="time-event"][data-occurrence-id="t"]',
        ) as HTMLElement;
    return { model, onEventDrop, onSelect, onEventClick, event, container };
}

describe("a pointer drag", () => {
    it("moves a timed event by an hour and a day", async () => {
        const { model, onEventDrop, event } = await week();
        expect(event().style.touchAction).toBe("none");
        await drag(event(), 100, 60);
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

    it("resizes a timed event from its end handle", async () => {
        const { model, event } = await week();
        const handle = event().querySelector(
            '[data-calendar-part="resize-handle"]',
        ) as HTMLElement;
        expect(handle.getAttribute("data-edge")).toBe("end");
        // the handle presses where its event is: half an hour below
        await drag(handle, 0, 30);
        expect(model.get("event-by", { id: "t" })?.end).toBe(
            "2026-11-26T10:30:00Z",
        );
    });

    it("selects a range over slots, and a tap on an event is a click", async () => {
        const { container, onSelect, onEventClick, event } = await week();
        const slot = container.querySelector(
            '[data-calendar-part="slot"][data-date="2026-11-25"][data-time="13:00"]',
        ) as HTMLElement;
        await drag(slot, 0, 60);
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
        // the selected slots say it in ARIA too
        expect(slot.getAttribute("aria-selected")).toBe("true");
        await drag(event(), 0, 0);
        expect(onEventClick).toHaveBeenCalledWith(
            expect.objectContaining({ eventId: "t", keyboard: false }),
        );
    });
});

describe("a month drag", () => {
    it("moves an all-day event by the days under the pointer", async () => {
        const model = modelOf([allDay("a", "2026-11-24", "2026-11-25")], {
            view: { type: "month", anchorDate: "2026-11-26" },
            features: [dragAndDrop()],
        });
        const wrapper = mount(
            () => h(Calendar.Root, { model }, () => h(MonthGrid)),
            { attachTo: document.body },
        );
        await flush();
        const segment = wrapper.element.querySelector(
            '[data-calendar-part="segment"]',
        ) as HTMLElement;
        await drag(segment, 200, 100);
        expect(model.get("event-by", { id: "a" })).toMatchObject({
            start: "2026-12-03",
            end: "2026-12-04",
        });
    });
});
