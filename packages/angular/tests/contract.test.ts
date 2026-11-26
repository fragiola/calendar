// The primitive contract in Angular terms (guidelines components/primitives.md, "In Vue and
// Angular"), on every directive of every view: a part attribute on every element, no text and no
// name of the library's own, boolean `data-*` present or absent, the directive on the consumer's
// element (its attributes and classes kept), state through `exportAs`, structural style only,
// the consumer's style kept under it.
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";
import { dragAndDrop } from "../drag-and-drop/public-api";
import { resize } from "../resize/public-api";
import { selection } from "../selection/public-api";
import { CALENDAR, type CalendarModel } from "../src/public-api";
import { allDay, modelOf, TestCalendar, timed } from "./calendar";
import { render } from "./interaction";

const EVENTS = [
    allDay("a", "2026-11-24", "2026-11-27"),
    timed("t", "09:00", "10:00"),
];
const FEATURES = [selection(), dragAndDrop(), resize()] as const;

describe("the primitive contract", () => {
    for (const type of ["month", "week", "list"] as const) {
        it(`${type}: names every element, renders no text, sets no name, writes boolean data-* present or absent`, async () => {
            const model = modelOf(EVENTS, {
                view: { type, anchorDate: "2026-11-26" },
                features: FEATURES,
            });
            const { container } = await render(TestCalendar, {
                model,
                features: true,
            });
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
            expect(container.textContent?.trim()).toBe("");
            expect(container.querySelector("[aria-label]")).toBeNull();
            expect(container.querySelector("[aria-labelledby]")).toBeNull();
            expect(container.querySelector("style, link, svg, img")).toBeNull();
            expect(container.querySelector("[class]")).toBeNull();
            // the parts of each view are there
            const parts = new Set(
                elements.map((element) =>
                    element.getAttribute("data-calendar-part"),
                ),
            );
            const expected = {
                month: [
                    "day-grid",
                    "column-headers",
                    "column-header",
                    "week",
                    "day",
                    "day-events",
                    "segment",
                    "resize-handle",
                ],
                week: [
                    "time-grid",
                    "all-day-row",
                    "scroller",
                    "slot-row",
                    "slot-label",
                    "slot",
                    "columns",
                    "column",
                    "column-events",
                    "time-event",
                    "resize-handle",
                ],
                list: ["list", "list-day", "list-event"],
            }[type];
            for (const name of [
                "root",
                "previous",
                "today",
                "next",
                "view-button",
                ...expected,
            ]) {
                expect(parts.has(name), name).toBe(true);
            }
        });
    }

    it("writes only structural inline style, positioned from the layout", async () => {
        const model = modelOf(EVENTS, {
            view: { type: "week", anchorDate: "2026-11-26" },
            features: FEATURES,
        });
        const { container } = await render(TestCalendar, {
            model,
            features: true,
        });
        const allowed = new Set([
            "position",
            "top",
            "height",
            "inset-inline-start",
            // `inset: 0`, as jsdom spells it out
            "inset",
            "right",
            "bottom",
            "left",
            "width",
            "pointer-events",
            "touch-action",
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
        // the engine's own structural style, kept by Angular
        expect(event?.style.touchAction).toBe("none");
    });

    it("sits on the consumer's elements: their tags, attributes, classes and style are kept, the structural style wins", async () => {
        @Component({
            imports: [CALENDAR],
            template: `
                <section
                    [calendarRoot]="model"
                    #calendar="calendarRoot"
                    class="calendar"
                    data-testid="root"
                    [class.busy]="calendar.state().gestureActive"
                >
                    <table calendarDayGrid aria-label="Month" class="grid">
                        <tbody>
                            <ng-template calendarWeeks let-week>
                                <tr
                                    [calendarWeek]="week"
                                    style="position: static; color: blue"
                                >
                                    <ng-template calendarDays let-day>
                                        <td
                                            [calendarDay]="day"
                                            #cell="calendarDay"
                                            [class.today]="cell.state()?.day?.today"
                                        ></td>
                                    </ng-template>
                                </tr>
                            </ng-template>
                        </tbody>
                    </table>
                    <button calendarViewButton="month" class="on"></button>
                </section>
            `,
        })
        class Consumer {
            readonly model = modelOf([], {
                view: { type: "month", anchorDate: "2026-11-26" },
            });
        }
        const { container } = await render(Consumer);
        const root = container.querySelector('[data-testid="root"]');
        expect(root?.tagName).toBe("SECTION");
        expect(root?.getAttribute("data-calendar-part")).toBe("root");
        expect(root?.className).toBe("calendar");
        const grid = container.querySelector("table");
        expect(grid?.getAttribute("role")).toBe("grid");
        expect(grid?.getAttribute("aria-label")).toBe("Month");
        const row = container.querySelector("tr") as HTMLElement;
        expect(row.getAttribute("data-calendar-part")).toBe("week");
        // the structural `position` wins over the consumer's; the rest of its style stays
        expect(row.style.position).toBe("relative");
        expect(row.style.color).toBe("blue");
        const today = container.querySelector(
            'td[data-date="2026-11-26"]',
        ) as HTMLElement;
        expect(today.className).toBe("today");
        expect(today.getAttribute("aria-current")).toBe("date");
        const button = container.querySelector("button") as HTMLButtonElement;
        expect(button.className).toBe("on");
        expect(button.type).toBe("button");
        expect(button.getAttribute("aria-pressed")).toBe("true");
    });

    it("gives each part's state through exportAs, current as the calendar changes", async () => {
        @Component({
            imports: [CALENDAR],
            template: `
                <div [calendarRoot]="model" #calendar="calendarRoot">
                    <span data-testid="view">{{ calendar.state().view }}</span>
                    <div calendarList #list="calendarList">
                        <span data-testid="empty">{{ list.state().empty }}</span>
                    </div>
                </div>
            `,
        })
        class States {
            readonly model = modelOf([], {
                view: { type: "list", anchorDate: "2026-11-26" },
            });
        }
        const { container, component, fixture } = await render(States);
        const text = (id: string) =>
            container.querySelector(`[data-testid="${id}"]`)?.textContent;
        expect(text("view")).toBe("list");
        expect(text("empty")).toBe("true");
        component.model.run("event.add", timed("t", "09:00", "10:00"));
        await fixture.whenStable();
        expect(text("empty")).toBe("false");
    });

    it("disables a navigation button whose command cannot run", async () => {
        @Component({
            imports: [CALENDAR],
            template: `
                <div [calendarRoot]="model">
                    <button calendarPrevious data-testid="previous"></button>
                </div>
            `,
        })
        class Bounded {
            readonly model = modelOf([], {
                view: { type: "month", anchorDate: "2026-11-26" },
                settings: {
                    validRange: { start: "2026-11-01", end: "2026-12-01" },
                },
            });
        }
        const { container } = await render(Bounded);
        const previous = container.querySelector(
            '[data-testid="previous"]',
        ) as HTMLButtonElement;
        expect(previous.disabled).toBe(true);
        expect(previous.hasAttribute("data-disabled")).toBe(true);
    });

    it("runs a navigation button's command on a click", async () => {
        @Component({
            imports: [CALENDAR],
            template: `
                <div [calendarRoot]="model">
                    <button calendarNext></button>
                    <button calendarViewButton="days" [days]="3"></button>
                </div>
            `,
        })
        class Navigation {
            readonly model = modelOf([], {
                view: { type: "month", anchorDate: "2026-11-26" },
            });
        }
        const { container, component, fixture } = await render(Navigation);
        const [next, days] = [...container.querySelectorAll("button")];
        next?.click();
        await fixture.whenStable();
        expect(component.model.state.view.anchorDate).toBe("2026-12-01");
        days?.click();
        await fixture.whenStable();
        expect(component.model.state.view).toMatchObject({
            type: "days",
            days: 3,
        });
        expect(days?.getAttribute("aria-pressed")).toBe("true");
    });

    it("fails a part outside its root with a message naming it", async () => {
        @Component({
            imports: [CALENDAR],
            template: `<div calendarDayGrid></div>`,
        })
        class Orphan {}
        expect(() => TestBed.createComponent(Orphan)).toThrow(
            "[calendarDayGrid] must be used inside [calendarRoot]",
        );
    });
});

describe("the time grid's accessibility structure", () => {
    it("is rows of slots, a gridcell per day, each day's timed events a list", async () => {
        const model = modelOf(EVENTS, {
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        const { container } = await render(TestCalendar, { model });
        const grid = container.querySelector('[role="grid"]') as HTMLElement;
        const rows = [...grid.querySelectorAll('[role="row"]')];
        // the header row, the all-day row, one row per 30-minute slot, then the columns' layer
        expect(rows).toHaveLength(2 + 48 + 1);
        expect(rows.at(-1)?.getAttribute("data-calendar-part")).toBe("columns");
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
    it("numbers the columns, so the header row and the rows of eight agree", async () => {
        const model = modelOf(EVENTS, {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const { container } = await render(TestCalendar, {
            model,
            weekNumbers: true,
        });
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

    it("warns once when a week number is rendered without it, and numbers nothing", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        @Component({
            imports: [CALENDAR],
            template: `
                <div [calendarRoot]="model">
                    <div calendarDayGrid>
                        <ng-template calendarWeeks let-week>
                            <div [calendarWeek]="week"><div calendarWeekNumber></div></div>
                        </ng-template>
                    </div>
                </div>
            `,
        })
        class Unnumbered {
            readonly model: CalendarModel = modelOf(EVENTS, {
                view: { type: "month", anchorDate: "2026-11-26" },
            });
        }
        const { container } = await render(Unnumbered);
        expect(
            container
                .querySelector('[role="grid"]')
                ?.hasAttribute("aria-colcount"),
        ).toBe(false);
        expect(
            warn.mock.calls.filter(([message]) =>
                String(message).includes("weekNumberColumn"),
            ),
        ).toHaveLength(1);
        warn.mockRestore();
    });

    it("follows the input: a week number column the app turns on is counted", async () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const { container, set } = await render(TestCalendar, { model });
        const grid = () => container.querySelector('[role="grid"]');
        expect(grid()?.hasAttribute("aria-colcount")).toBe(false);
        await set({ weekNumbers: true });
        expect(grid()?.getAttribute("aria-colcount")).toBe("8");
    });
});
