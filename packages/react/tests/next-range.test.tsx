// The next range reuses the time grid's cells (Epic #27): the headers, the all-day days, the slots
// and the columns are keyed by their position, so Next gives the same elements their new dates
// instead of new elements. Each one is registered again under its new date: the keyboard, the tab
// stop and a press find it there.
import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Calendar } from "../src";
import { selection } from "../src/selection";
import { allDay, modelOf, TimeGridView, Toolbar } from "./calendar";
import { drag, focused, key } from "./interaction";

const cells = (container: HTMLElement) =>
    [
        ...container.querySelectorAll<HTMLElement>(
            '[data-calendar-part="column-header"], [data-calendar-part="day"], [data-calendar-part="slot"], [data-calendar-part="column"]',
        ),
    ] as HTMLElement[];

function week(
    onSelect?: (event: unknown) => void,
    onAnnounce?: (event: unknown) => void,
) {
    const model = modelOf([allDay("a", "2026-11-26", "2026-11-27")], {
        view: { type: "week", anchorDate: "2026-11-26" },
        features: [selection()],
    });
    const view = render(
        <Calendar.Root
            model={model}
            onSelect={onSelect}
            onAnnounce={onAnnounce}
        >
            <Toolbar />
            <TimeGridView />
        </Calendar.Root>,
    );
    return { model, ...view };
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
    it("keeps the cells' elements, each with its new date", () => {
        const { container } = week();
        const before = cells(container);
        const dates = before.map((cell) => cell.getAttribute("data-date"));
        act(() => {
            fireEvent.click(
                container.querySelector(
                    '[data-calendar-part="next"]',
                ) as Element,
            );
        });
        const after = cells(container);
        expect(after).toHaveLength(before.length);
        for (const [index, cell] of after.entries()) {
            expect(cell).toBe(before[index]);
        }
        expect(after.map((cell) => cell.getAttribute("data-date"))).toEqual(
            dates.map((date) => {
                const next = new Date(`${date}T00:00:00Z`);
                next.setUTCDate(next.getUTCDate() + 7);
                return next.toISOString().slice(0, 10);
            }),
        );
        // one tab stop, on the new week's first slot
        const stops = container.querySelectorAll('[tabindex="0"]');
        expect(stops).toHaveLength(1);
        expect(stops[0]?.getAttribute("data-date")).toBe("2026-11-29");
    });

    it("moves the keyboard focus over the reused cells", () => {
        const { container } = week();
        act(() =>
            (container.querySelector('[tabindex="0"]') as HTMLElement).focus(),
        );
        expect(focused()).toBe("slot 2026-11-26 00:00");
        key("PageDown");
        expect(focused()).toBe("slot 2026-12-03 00:00");
        key("ArrowRight");
        expect(focused()).toBe("slot 2026-12-04 00:00");
        key("PageUp");
        key("ArrowLeft");
        expect(focused()).toBe("slot 2026-11-26 00:00");
        expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    });

    it("announces the range PageDown shows, the focus kept on the same element", () => {
        const onAnnounce = vi.fn();
        const { container } = week(undefined, onAnnounce);
        act(() => {
            fireEvent.click(
                container.querySelector(
                    '[data-calendar-part="next"]',
                ) as Element,
            );
            fireEvent.click(
                container.querySelector(
                    '[data-calendar-part="previous"]',
                ) as Element,
            );
        });
        // the toolbar's buttons are the app's: no announcement
        expect(onAnnounce).not.toHaveBeenCalled();
        const cell = container.querySelector('[tabindex="0"]') as HTMLElement;
        act(() => cell.focus());
        key("PageDown");
        expect(document.activeElement).toBe(cell);
        expect(onAnnounce).toHaveBeenCalledExactlyOnceWith(ANNOUNCEMENT);
    });

    it("selects from a reused slot at its new date", () => {
        const onSelect = vi.fn();
        const { container } = week(onSelect);
        act(() => {
            fireEvent.click(
                container.querySelector(
                    '[data-calendar-part="next"]',
                ) as Element,
            );
        });
        const slot = container.querySelector(
            '[data-calendar-part="slot"][data-date="2026-12-01"][data-time="13:00"]',
        ) as HTMLElement;
        drag(slot, 0, 60);
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
