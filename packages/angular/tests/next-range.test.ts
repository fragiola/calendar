// The next range reuses the time grid's cells (Epic #27), as packages/react's: the headers, the
// all-day days, the slots and the columns are keyed by their position, so Next gives the same
// views (and elements) their new dates. Each one is registered again under its new date: the
// keyboard, the tab stop and a press find it there.
import { fireEvent } from "@testing-library/dom";
import { describe, expect, it, vi } from "vitest";
import { selection } from "../selection/public-api";
import { allDay, FeatureCalendar, modelOf } from "./calendar";
import { drag, flush, focused, key, part, render } from "./interaction";

const cells = (container: Element) => [
    ...container.querySelectorAll<HTMLElement>(
        '[data-calendar-part="column-header"], [data-calendar-part="day"], [data-calendar-part="slot"], [data-calendar-part="column"]',
    ),
];

async function week(onEvent?: (event: unknown) => void) {
    const model = modelOf([allDay("a", "2026-11-26", "2026-11-27")], {
        view: { type: "week", anchorDate: "2026-11-26" },
        features: [selection()],
    });
    const rendered = await render(FeatureCalendar, {
        model,
        features: false,
        ...(onEvent ? { onEvent } : {}),
    });
    return { model, ...rendered };
}

async function next(container: Element) {
    fireEvent.click(
        container.querySelector('[data-calendar-part="next"]') as Element,
    );
    await flush();
}

const ANNOUNCEMENT = {
    type: "announce",
    announcement: {
        kind: "range",
        range: { start: "2026-11-29", end: "2026-12-06" },
        focused: { kind: "slot", date: "2026-12-03", time: "00:00" },
    },
};

describe("Next in a time grid", () => {
    it("keeps the cells' elements, each with its new date", async () => {
        const { container } = await week();
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
        const { container } = await week();
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

    it("announces the range PageDown shows (`(announce)`), the focus kept on the same element", async () => {
        const onEvent = vi.fn();
        const { container } = await week(onEvent);
        await next(container);
        fireEvent.click(
            container.querySelector(
                '[data-calendar-part="previous"]',
            ) as Element,
        );
        await flush();
        // the toolbar's buttons are the app's: no announcement
        expect(onEvent).not.toHaveBeenCalled();
        const cell = container.querySelector('[tabindex="0"]') as HTMLElement;
        cell.focus();
        await key("PageDown");
        expect(document.activeElement).toBe(cell);
        expect(onEvent).toHaveBeenCalledExactlyOnceWith(ANNOUNCEMENT);
    });

    it("selects from a reused slot at its new date", async () => {
        const { container, model } = await week();
        await next(container);
        const slot = part(container, "slot", {
            "data-date": "2026-12-01",
            "data-time": "13:00",
        });
        await drag(slot, 0, 60);
        expect(model.get("selected-range")).toMatchObject({
            start: "2026-12-01T13:00:00Z",
            end: "2026-12-01T14:30:00Z",
        });
    });
});
