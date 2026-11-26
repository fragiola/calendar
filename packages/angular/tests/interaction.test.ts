// Pointer gestures and the keyboard through the adapter (D12–D14), and the zoneless render: a
// change of the calendar after a pointer or a key event is on screen before the next task (one
// `ApplicationRef.tick()` per root and task, in a microtask), and an error of that render goes to
// the app's `ErrorHandler`.
import { ApplicationRef, ErrorHandler } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { fireEvent } from "@testing-library/dom";
import { describe, expect, it, vi } from "vitest";
import { dragAndDrop } from "../drag-and-drop/public-api";
import { resize } from "../resize/public-api";
import { selection } from "../selection/public-api";
import type { CalendarEngineEvent } from "../src/public-api";
import {
    allDay,
    FeatureCalendar,
    modelOf,
    TestCalendar,
    timed,
} from "./calendar";
import { center, drag, focused, key, part, render } from "./interaction";

const FEATURES = [selection(), dragAndDrop(), resize()] as const;

/** Two microtasks: the root's render, and what it queued. No task runs in between. */
async function microtasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

function tabStop(container: HTMLElement): HTMLElement {
    const stops = container.querySelectorAll<HTMLElement>('[tabindex="0"]');
    expect(stops).toHaveLength(1);
    return stops[0] as HTMLElement;
}

async function week(events = [timed("t", "09:00", "10:00")]) {
    const model = modelOf(events, {
        view: { type: "week", anchorDate: "2026-11-26" },
        features: FEATURES,
    });
    const onEvent = vi.fn<(event: CalendarEngineEvent) => void>();
    const rendered = await render(FeatureCalendar, { model, onEvent });
    const event = () =>
        part(rendered.container, "time-event", { "data-occurrence-id": "t" });
    const types = () => onEvent.mock.calls.map(([one]) => one.type);
    return { model, onEvent, event, types, ...rendered };
}

describe("a pointer drag", () => {
    it("moves a timed event by an hour and a day, one command, and the root's (eventDrop)", async () => {
        const { model, onEvent, event } = await week();
        expect(event().style.touchAction).toBe("none");
        await drag(event(), 100, 60);
        expect(model.get("event-by", { id: "t" })).toMatchObject({
            start: "2026-11-27T10:00:00Z",
            end: "2026-11-27T11:00:00Z",
        });
        // calendarDragAndDrop and calendarResize are one directive: each drop is told once
        const drops = onEvent.mock.calls.filter(([one]) => one.type === "drop");
        expect(drops).toHaveLength(1);
        expect(drops[0]?.[0]).toMatchObject({ kind: "move", keyboard: false });
        // the moved event's new element, in its new column, keeps the engine's style
        expect(
            event()
                .closest('[data-calendar-part="column"]')
                ?.getAttribute("data-date"),
        ).toBe("2026-11-27");
        expect(event().style.touchAction).toBe("none");
    });

    it("resizes an event from its handle, and selects a range of slots ((rangeSelect))", async () => {
        const { model, container, types } = await week();
        const handle = part(container, "resize-handle", {
            "data-occurrence-id": "t",
        });
        await drag(handle, 0, 30);
        expect(model.get("event-by", { id: "t" })?.end).toBe(
            "2026-11-26T10:30:00Z",
        );
        const slot = part(container, "slot", {
            "data-date": "2026-11-25",
            "data-time": "13:00",
        });
        await drag(slot, 0, 60);
        expect(model.get("selected-range")).toMatchObject({
            start: "2026-11-25T13:00:00Z",
            end: "2026-11-25T14:30:00Z",
        });
        expect(types()).toContain("select");
        // the highlight, in its column
        const highlight = part(container, "selection");
        expect(
            highlight
                .closest('[data-calendar-part="column"]')
                ?.getAttribute("data-date"),
        ).toBe("2026-11-25");
        expect(highlight.getAttribute("aria-hidden")).toBe("true");
    });

    it("previews a drag where it would land, then removes the preview", async () => {
        const { container, event } = await week();
        const start = center(event());
        const init = (y: number, buttons: number) => ({
            pointerId: 9,
            pointerType: "mouse",
            isPrimary: true,
            button: 0,
            buttons,
            clientX: start.x,
            clientY: y,
            bubbles: true,
        });
        fireEvent.pointerDown(event(), init(start.y, 1));
        fireEvent.pointerMove(event(), init(start.y + 30, 1));
        fireEvent.pointerMove(event(), init(start.y + 60, 1));
        await microtasks();
        const preview = part(container, "drag-preview");
        // an hour later: 10:00 of a 24-hour column
        expect(Number.parseFloat(preview.style.top)).toBeCloseTo(
            (10 / 24) * 100,
        );
        expect(event().hasAttribute("data-dragging")).toBe(true);
        fireEvent.pointerUp(event(), init(start.y + 60, 0));
        await microtasks();
        expect(
            container.querySelector('[data-calendar-part="drag-preview"]'),
        ).toBeNull();
    });
});

describe("the keyboard", () => {
    it("moves the one tab stop over slots and into the all-day row", async () => {
        const model = modelOf([allDay("a", "2026-11-26", "2026-11-27")], {
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        const { container } = await render(TestCalendar, { model });
        tabStop(container).focus();
        expect(focused()).toBe("slot 2026-11-26 00:00");
        await key("ArrowDown");
        expect(focused()).toBe("slot 2026-11-26 00:30");
        await key("ArrowRight");
        expect(focused()).toBe("slot 2026-11-27 00:30");
        await key("ArrowUp");
        await key("ArrowUp");
        expect(focused()).toBe("day 2026-11-27");
        await key("ArrowLeft");
        await key("Enter");
        expect(focused()).toBe("segment a");
        await key("Escape");
        expect(focused()).toBe("day 2026-11-26");
        expect(tabStop(container)).toBe(document.activeElement);
    });

    it("grabs an event with Space, moves it with the arrows, and drops it with Enter", async () => {
        const { model, container, types } = await week();
        part(container, "slot", {
            "data-date": "2026-11-26",
            "data-time": "09:00",
        }).focus();
        await key("Enter");
        expect(focused()).toBe("time-event t");
        await key(" ");
        expect(
            part(container, "time-event", {
                "data-occurrence-id": "t",
            }).hasAttribute("data-grabbed"),
        ).toBe(true);
        await key("ArrowRight");
        await key("Enter");
        expect(model.get("event-by", { id: "t" })?.start).toBe(
            "2026-11-27T09:00:00Z",
        );
        expect(types()).toContain("drop");
        // the focus followed the event to its new element
        expect(focused()).toBe("time-event t");
        expect(
            document.activeElement
                ?.closest('[data-calendar-part="column"]')
                ?.getAttribute("data-date"),
        ).toBe("2026-11-27");
    });
});

describe("the zoneless render", () => {
    it("shows a key's move before the next task: the focus mark is on screen after a microtask", async () => {
        const model = modelOf([], {
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        const { container } = await render(TestCalendar, { model });
        tabStop(container).focus();
        await key("ArrowDown");
        const from = part(container, "slot", {
            "data-date": "2026-11-26",
            "data-time": "00:30",
        });
        expect(from.hasAttribute("data-focused")).toBe(true);
        fireEvent.keyDown(from, { key: "ArrowDown" });
        // zoneless Angular renders in a later task; the root renders the calendar's change in a
        // microtask, so whatever reads the page right after the key sees it
        await microtasks();
        const to = part(container, "slot", {
            "data-date": "2026-11-26",
            "data-time": "01:00",
        });
        expect(to.hasAttribute("data-focused")).toBe(true);
        expect(to.getAttribute("tabindex")).toBe("0");
        expect(from.hasAttribute("data-focused")).toBe(false);
    });

    it("shows a pointer's drop before the next task: the event is in its new column after a microtask", async () => {
        const { event } = await week();
        const start = center(event());
        const init = (x: number, buttons: number) => ({
            pointerId: 7,
            pointerType: "mouse",
            isPrimary: true,
            button: 0,
            buttons,
            clientX: x,
            clientY: start.y,
            bubbles: true,
        });
        fireEvent.pointerDown(event(), init(start.x, 1));
        await microtasks();
        fireEvent.pointerMove(event(), init(start.x + 50, 1));
        await microtasks();
        fireEvent.pointerMove(event(), init(start.x + 100, 1));
        await microtasks();
        fireEvent.pointerUp(event(), init(start.x + 100, 0));
        await microtasks();
        expect(
            event()
                .closest('[data-calendar-part="column"]')
                ?.getAttribute("data-date"),
        ).toBe("2026-11-27");
    });

    it("renders several commits of one task once, and a root destroyed before its render throws nothing", async () => {
        const model = modelOf([timed("t", "09:00", "10:00")], {
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        const { fixture } = await render(TestCalendar, { model });
        const tick = vi.spyOn(TestBed.inject(ApplicationRef), "tick");
        model.run("event.move", { eventId: "t", delta: { minutes: 30 } });
        model.run("event.move", { eventId: "t", delta: { minutes: 30 } });
        await microtasks();
        expect(tick).toHaveBeenCalledTimes(1);
        tick.mockClear();
        model.run("event.move", { eventId: "t", delta: { minutes: 30 } });
        fixture.destroy();
        await microtasks();
        expect(() =>
            model.run("event.move", { eventId: "t", delta: { minutes: 30 } }),
        ).not.toThrow();
        await microtasks();
        tick.mockRestore();
    });

    it("gives an error of the root's own render to the app's ErrorHandler, as Angular's renders do", async () => {
        const model = modelOf([timed("t", "09:00", "10:00")], {
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        await render(TestCalendar, { model });
        const failure = new Error("a template failed");
        const tick = vi
            .spyOn(TestBed.inject(ApplicationRef), "tick")
            .mockImplementationOnce(() => {
                throw failure;
            });
        const handled = vi
            .spyOn(TestBed.inject(ErrorHandler), "handleError")
            .mockImplementation(() => {});
        model.run("event.move", { eventId: "t", delta: { minutes: 30 } });
        await microtasks();
        expect(tick).toHaveBeenCalledTimes(1);
        expect(handled).toHaveBeenCalledWith(failure);
        tick.mockRestore();
        handled.mockRestore();
    });
});
