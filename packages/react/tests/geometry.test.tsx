// A day grid's geometry is the adapter's structural style, from the layout (D18): a segment sits in
// its lane and spans its days on logical properties, its day's events hold the row's lanes, and a
// row's decorations sit over their days with the row as their containing block.
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Calendar } from "../src";
import { selection } from "../src/selection";
import { allDay, MonthGrid, modelOf } from "./calendar";

function segment(container: HTMLElement, id: string): HTMLElement {
    return container.querySelector(
        `[data-calendar-part="segment"][data-occurrence-id="${id}"]`,
    ) as HTMLElement;
}

describe("day-grid geometry", () => {
    it("places a segment in its lane over its days, with logical properties", () => {
        const model = modelOf(
            [
                allDay("long", "2026-11-23", "2026-11-26"),
                allDay("one", "2026-11-24", "2026-11-25"),
            ],
            { view: { type: "month", anchorDate: "2026-11-26" } },
        );
        const { container } = render(
            <Calendar.Root model={model}>
                <MonthGrid />
            </Calendar.Root>,
        );
        const long = segment(container, "long").style;
        expect(long.position).toBe("absolute");
        expect(long.getPropertyValue("inset-inline-start")).toBe("0px");
        expect(long.getPropertyValue("inset-block-start")).toBe(
            "calc(0 * var(--calendar-lane-size, 1.5rem))",
        );
        expect(long.getPropertyValue("block-size")).toBe(
            "var(--calendar-lane-size, 1.5rem)",
        );
        expect(long.getPropertyValue("inline-size")).toBe(
            "calc(3 * 100% + 2 * var(--calendar-day-gap, 0px))",
        );
        const one = segment(container, "one").style;
        expect(one.getPropertyValue("inset-block-start")).toBe(
            "calc(1 * var(--calendar-lane-size, 1.5rem))",
        );
        expect(one.getPropertyValue("inline-size")).toBe("100%");
        // every day of the row holds the row's two lanes; its segments' containing block
        const events = container.querySelector(
            '[data-calendar-part="day-events"][data-date="2026-11-27"]',
        ) as HTMLElement;
        expect(events.style.position).toBe("relative");
        expect(events.style.getPropertyValue("min-block-size")).toBe(
            "calc(2 * var(--calendar-lane-size, 1.5rem))",
        );
        // the row is its decorations' containing block
        const week = events.closest(
            '[data-calendar-part="week"]',
        ) as HTMLElement;
        expect(week.style.position).toBe("relative");
    });

    it('holds no lanes with dayMaxEvents: "auto", which measures the day', () => {
        const model = modelOf([allDay("a", "2026-11-24", "2026-11-25")], {
            view: { type: "month", anchorDate: "2026-11-26" },
            settings: { dayMaxEvents: "auto" },
        });
        const { container } = render(
            <Calendar.Root model={model}>
                <MonthGrid />
            </Calendar.Root>,
        );
        const events = container.querySelector(
            '[data-calendar-part="day-events"]',
        ) as HTMLElement;
        expect(events.style.position).toBe("relative");
        expect(events.style.getPropertyValue("min-block-size")).toBe("");
    });

    it("places a row's selection over its days after the row's inset", () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
            features: [selection()],
        });
        const { container } = render(
            <Calendar.Root model={model}>
                <MonthGrid features />
            </Calendar.Root>,
        );
        act(() => {
            model.run("selection.set", {
                start: "2026-11-24",
                end: "2026-11-26",
                allDay: true,
            });
        });
        const highlight = container.querySelector(
            '[data-calendar-part="selection"]',
        ) as HTMLElement;
        const style = highlight.style;
        expect(style.position).toBe("absolute");
        expect(style.getPropertyValue("inset-inline-start")).toBe(
            "calc(var(--calendar-row-inset, 0px) + (100% - var(--calendar-row-inset, 0px)) * 0.2857142857142857)",
        );
        expect(style.getPropertyValue("inline-size")).toBe(
            "calc((100% - var(--calendar-row-inset, 0px)) * 0.2857142857142857)",
        );
    });
});
