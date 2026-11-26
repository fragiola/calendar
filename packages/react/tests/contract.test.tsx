// The primitive contract (`guidelines/components/primitives.md`), on every primitive of every
// view: a part attribute on every element, no text and no name of the library's own, boolean
// `data-*` present or absent, `render` (an element or a function), merged refs, handlers composed
// internal first, `className` / `style` from the state, structural style only.
import { act, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { Calendar, type DayState, type RenderedProps } from "../src";
import { dragAndDrop } from "../src/drag-and-drop";
import { resize } from "../src/resize";
import { selection } from "../src/selection";
import {
    allDay,
    ListView,
    MonthGrid,
    modelOf,
    TimeGridView,
    Toolbar,
    timed,
} from "./calendar";

const EVENTS = [
    allDay("a", "2026-11-24", "2026-11-27"),
    timed("t", "09:00", "10:00"),
];
const FEATURES = [selection(), dragAndDrop(), resize()] as const;

function views() {
    return [
        ["month", <MonthGrid key="m" features />],
        ["week", <TimeGridView key="w" features />],
        ["list", <ListView key="l" />],
    ] as const;
}

describe("the primitive contract", () => {
    for (const [type, view] of views()) {
        it(`${type}: names every element, renders no text, sets no name, writes boolean data-* present or absent`, () => {
            const model = modelOf(EVENTS, {
                view: { type, anchorDate: "2026-11-26" },
                features: FEATURES,
            });
            const { container } = render(
                <Calendar.Root model={model}>
                    <Toolbar />
                    {view}
                </Calendar.Root>,
            );
            const elements = [...container.querySelectorAll("*")];
            expect(elements.length).toBeGreaterThan(10);
            for (const element of elements) {
                expect(
                    element.getAttribute("data-calendar-part"),
                    element.outerHTML.slice(0, 80),
                ).toBeTruthy();
                for (const attribute of element.getAttributeNames()) {
                    if (attribute.startsWith("data-")) {
                        expect(element.getAttribute(attribute)).not.toBe(
                            "false",
                        );
                    }
                }
            }
            expect(container.textContent).toBe("");
            expect(container.querySelector("[aria-label]")).toBeNull();
            expect(container.querySelector("[aria-labelledby]")).toBeNull();
            expect(container.querySelector("style, link, svg, img")).toBeNull();
            expect(container.querySelector("[class]")).toBeNull();
        });
    }

    it("writes only structural inline style", () => {
        const model = modelOf(EVENTS, {
            view: { type: "week", anchorDate: "2026-11-26" },
            features: FEATURES,
        });
        const { container } = render(
            <Calendar.Root model={model}>
                <TimeGridView features />
            </Calendar.Root>,
        );
        const allowed = new Set([
            "position",
            "top",
            "height",
            "inset-inline-start",
            // `inset: 0`, as jsdom spells it out
            "right",
            "bottom",
            "left",
            "width",
            "pointer-events",
            "touch-action",
            // a day grid's segments and lanes, on logical properties
            "inset-block-start",
            "inset-block-end",
            "inset-block",
            "block-size",
            "inline-size",
            "min-block-size",
        ]);
        for (const element of container.querySelectorAll<HTMLElement>(
            "[style]",
        )) {
            for (const property of [...element.style]) {
                expect(allowed.has(property), property).toBe(true);
            }
        }
        const event = container.querySelector<HTMLElement>(
            '[data-calendar-part="time-event"]',
        );
        // 09:00–10:00 of a 24-hour column, alone in its cluster
        expect(event?.style.top).toBe("37.5%");
        expect(Number.parseFloat(event?.style.height ?? "")).toBeCloseTo(
            100 / 24,
        );
        expect(event?.style.width).toBe("100%");
    });

    it("replaces the element with a render element, merging the props", () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        render(
            <Calendar.Root
                model={model}
                render={<section data-testid="root" />}
            >
                <Calendar.DayGrid render={<table data-testid="grid" />} />
            </Calendar.Root>,
        );
        const root = screen.getByTestId("root");
        expect(root.tagName).toBe("SECTION");
        expect(root.getAttribute("data-calendar-part")).toBe("root");
        expect(root.getAttribute("data-view")).toBe("month");
        expect(screen.getByTestId("grid").getAttribute("role")).toBe("grid");
    });

    it("calls a render function with the props and the state", () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const seen: DayState[] = [];
        render(
            <Calendar.Root model={model}>
                <Calendar.DayGrid>
                    <Calendar.Weeks>
                        {(week) => (
                            <Calendar.Week week={week}>
                                {(day) => (
                                    <Calendar.Day
                                        day={day}
                                        render={(
                                            props: RenderedProps,
                                            state: DayState,
                                        ) => {
                                            seen.push(state);
                                            return <td {...props} />;
                                        }}
                                    />
                                )}
                            </Calendar.Week>
                        )}
                    </Calendar.Weeks>
                </Calendar.DayGrid>
            </Calendar.Root>,
        );
        const today = seen.find((state) => state.day.today);
        expect(today?.day.date).toBe("2026-11-26");
        const cell = document.querySelector('[data-date="2026-11-26"]');
        expect(cell?.tagName).toBe("TD");
        expect(cell?.getAttribute("role")).toBe("gridcell");
        expect(cell?.hasAttribute("data-today")).toBe(true);
    });

    it("merges the consumer's ref with the primitive's and composes handlers internal first", () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const ref = React.createRef<HTMLElement>();
        const calls: string[] = [];
        render(
            <Calendar.Root model={model}>
                <Calendar.Next
                    ref={ref}
                    onClick={() => calls.push(model.state.view.anchorDate)}
                />
            </Calendar.Root>,
        );
        expect(ref.current?.tagName).toBe("BUTTON");
        act(() => {
            fireEvent.click(ref.current as HTMLElement);
        });
        // the primitive's own handler ran first: the consumer's sees the next month
        expect(calls).toEqual(["2026-12-01"]);
    });

    it("hands the element to a new ref object when the consumer swaps it, and clears the old one", () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const first = React.createRef<HTMLElement>();
        const second = React.createRef<HTMLElement>();
        const calls: (string | null)[] = [];
        const callback = (element: HTMLElement | null) => {
            calls.push(element?.tagName ?? null);
        };
        const { rerender } = render(
            <Calendar.Root model={model}>
                <Calendar.Next ref={first} />
                <Calendar.Today ref={callback} />
            </Calendar.Root>,
        );
        expect(first.current?.tagName).toBe("BUTTON");
        calls.length = 0;
        rerender(
            <Calendar.Root model={model}>
                <Calendar.Next ref={second} />
                <Calendar.Today ref={(element) => callback(element)} />
            </Calendar.Root>,
        );
        expect(first.current).toBeNull();
        expect(second.current?.tagName).toBe("BUTTON");
        // a new inline callback ref does not detach and re-attach the element
        expect(calls).toEqual([]);
    });

    it("resolves className and style functions against the state", () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        render(
            <Calendar.Root
                model={model}
                className={(state) => `view-${state.view}`}
                style={(state) => ({
                    color: state.gestureActive ? "red" : "blue",
                })}
                data-testid="root"
            >
                <Calendar.ViewButton
                    view="month"
                    className={(state) => (state.pressed ? "on" : "off")}
                    data-testid="month"
                />
            </Calendar.Root>,
        );
        const root = screen.getByTestId("root");
        expect(root.className).toBe("view-month");
        expect(root.style.color).toBe("blue");
        const button = screen.getByTestId("month");
        expect(button.className).toBe("on");
        expect(button.getAttribute("aria-pressed")).toBe("true");
    });

    it("disables a navigation button whose command cannot run", () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
            settings: {
                validRange: { start: "2026-11-01", end: "2026-12-01" },
            },
        });
        render(
            <Calendar.Root model={model}>
                <Calendar.Previous data-testid="previous" />
            </Calendar.Root>,
        );
        const previous = screen.getByTestId("previous") as HTMLButtonElement;
        expect(previous.disabled).toBe(true);
        expect(previous.hasAttribute("data-disabled")).toBe(true);
    });

    it("fails a part outside its root with a message naming it", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => render(<Calendar.DayGrid />)).toThrow(
            "Calendar.DayGrid must be rendered inside Calendar.Root",
        );
        error.mockRestore();
    });
});

describe("the time grid's accessibility structure", () => {
    it("is rows of slots, a gridcell per day, each day's timed events a list", () => {
        const model = modelOf(EVENTS, {
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        const { container } = render(
            <Calendar.Root model={model}>
                <TimeGridView />
            </Calendar.Root>,
        );
        const grid = container.querySelector('[role="grid"]') as HTMLElement;
        const rows = [...grid.querySelectorAll('[role="row"]')];
        // the header row, the all-day row, one row per 30-minute slot, then the columns' layer
        expect(rows).toHaveLength(2 + 48 + 1);
        expect(rows.at(-1)?.getAttribute("data-calendar-part")).toBe("columns");
        expect(rows[0]?.getAttribute("data-calendar-part")).toBe(
            "column-headers",
        );
        expect(rows[0]?.querySelectorAll('[role="columnheader"]')).toHaveLength(
            7,
        );
        expect(rows[1]?.getAttribute("data-calendar-part")).toBe("all-day-row");
        expect(rows[1]?.querySelectorAll('[role="gridcell"]')).toHaveLength(7);
        const nine = rows.find(
            (row) => row.getAttribute("data-time") === "09:00",
        );
        expect(nine?.querySelector('[role="rowheader"]')).not.toBeNull();
        expect(nine?.querySelectorAll('[role="gridcell"]')).toHaveLength(7);
        // a column is the layer's cell for its day; its events a list of list items in it
        const column = container.querySelector(
            '[data-calendar-part="column"][data-date="2026-11-26"]',
        ) as HTMLElement;
        expect(column.getAttribute("role")).toBe("gridcell");
        expect(column.parentElement?.getAttribute("role")).toBe("row");
        const list = column.querySelector('[role="list"]');
        expect(list?.querySelectorAll('[role="listitem"]')).toHaveLength(1);
        // one tab stop: today's first slot
        expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
        expect(
            container
                .querySelector('[tabindex="0"]')
                ?.getAttribute("data-calendar-part"),
        ).toBe("slot");
    });
});

describe("a month's week numbers (weekNumberColumn)", () => {
    it("numbers the columns, so the header row and the rows of eight agree", () => {
        const model = modelOf(EVENTS, {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const { container } = render(
            <Calendar.Root model={model} weekNumberColumn>
                <MonthGrid />
            </Calendar.Root>,
        );
        const grid = container.querySelector('[role="grid"]') as HTMLElement;
        expect(grid.getAttribute("aria-colcount")).toBe("8");
        const headers = [...grid.querySelectorAll('[role="columnheader"]')];
        expect(headers.map((one) => one.getAttribute("aria-colindex"))).toEqual(
            ["2", "3", "4", "5", "6", "7", "8"],
        );
        const row = grid.querySelectorAll('[data-calendar-part="week"]')[1];
        const cells = [
            ...(row?.querySelectorAll(
                '[role="rowheader"], [role="gridcell"]',
            ) ?? []),
        ];
        expect(cells.map((one) => one.getAttribute("aria-colindex"))).toEqual([
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
        ]);
    });

    it("warns once when a week number is rendered without it, and numbers nothing", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const model = modelOf(EVENTS, {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const { container } = render(
            <Calendar.Root model={model}>
                <MonthGrid />
            </Calendar.Root>,
        );
        expect(
            container
                .querySelector('[role="grid"]')
                ?.hasAttribute("aria-colcount"),
        ).toBe(false);
        const messages = warn.mock.calls.map(([message]) => String(message));
        expect(
            messages.filter((message) => message.includes("weekNumberColumn")),
        ).toHaveLength(1);
        warn.mockRestore();
    });
});
