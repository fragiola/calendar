// The primitive contract in Vue terms (guidelines components/primitives.md, "In Vue and
// Angular"), on every primitive of every view: a part attribute on every element, no text and no
// name of the library's own, boolean `data-*` present or absent, `as` and the `#render` slot,
// template refs, listeners composed internal first, plain `class` / `style` merged under the
// structural style, structural style only.
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { Calendar, type DayState } from "../src";
import { dragAndDrop } from "../src/drag-and-drop";
import { resize } from "../src/resize";
import { selection } from "../src/selection";
import {
    allDay,
    COMPONENTS,
    ListView,
    MonthGrid,
    modelOf,
    TimeGridView,
    Toolbar,
    timed,
} from "./calendar";
import { flush } from "./interaction";

const EVENTS = [
    allDay("a", "2026-11-24", "2026-11-27"),
    timed("t", "09:00", "10:00"),
];
const FEATURES = [selection(), dragAndDrop(), resize()] as const;

const VIEWS = [
    ["month", MonthGrid],
    ["week", TimeGridView],
    ["list", ListView],
] as const;

describe("the primitive contract", () => {
    for (const [type, view] of VIEWS) {
        it(`${type}: names every element, renders no text, sets no name, writes boolean data-* present or absent`, async () => {
            const model = modelOf(EVENTS, {
                view: { type, anchorDate: "2026-11-26" },
                features: FEATURES,
            });
            const wrapper = mount(
                () =>
                    h(Calendar.Root, { model }, () => [
                        h(Toolbar),
                        h(view, { features: true }),
                    ]),
                { attachTo: document.body },
            );
            await flush();
            const container = wrapper.element.parentElement as HTMLElement;
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

    it("writes only structural inline style", async () => {
        const model = modelOf(EVENTS, {
            view: { type: "week", anchorDate: "2026-11-26" },
            features: FEATURES,
        });
        const wrapper = mount(() =>
            h(Calendar.Root, { model }, () =>
                h(TimeGridView, { features: true }),
            ),
        );
        await flush();
        const allowed = new Set([
            "position",
            "top",
            "height",
            "inset-inline-start",
            // `inset: 0`, as jsdom spells it out
            "right",
            "bottom",
            "left",
            "inset",
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
        for (const element of (
            wrapper.element as Element
        ).querySelectorAll<HTMLElement>("[style]")) {
            for (const property of [...element.style]) {
                expect(allowed.has(property), property).toBe(true);
            }
        }
        const event = (wrapper.element as Element).querySelector<HTMLElement>(
            '[data-calendar-part="time-event"]',
        );
        // 09:00–10:00 of a 24-hour column, alone in its cluster
        expect(event?.style.top).toBe("37.5%");
        expect(Number.parseFloat(event?.style.height ?? "")).toBeCloseTo(
            100 / 24,
        );
        expect(event?.style.width).toBe("100%");
    });

    it("replaces the element with `as`, a tag or a component", async () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const Section = defineComponent({
            inheritAttrs: true,
            setup:
                (_, { slots }) =>
                () =>
                    h("section", slots.default?.()),
        });
        const wrapper = mount(() =>
            h(
                Calendar.Root,
                { model, as: Section, "data-testid": "root" },
                () =>
                    h(Calendar.DayGrid, { as: "table", "data-testid": "grid" }),
            ),
        );
        await flush();
        const root = wrapper.get('[data-testid="root"]').element;
        expect(root.tagName).toBe("SECTION");
        expect(root.getAttribute("data-calendar-part")).toBe("root");
        expect(root.getAttribute("data-view")).toBe("month");
        const grid = wrapper.get('[data-testid="grid"]').element;
        expect(grid.tagName).toBe("TABLE");
        expect(grid.getAttribute("role")).toBe("grid");
    });

    it("calls the #render slot with the props, the state and the children", async () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const seen: DayState[] = [];
        const App = defineComponent({
            components: COMPONENTS,
            setup: () => ({ seen }),
            template: `
                <Calendar.Root :model="model">
                    <Calendar.DayGrid>
                        <Calendar.Weeks v-slot="{ week }">
                            <Calendar.Week :week="week">
                                <template #day="{ day }">
                                    <Calendar.Day :day="day">
                                        <template #render="{ props, state, children }">
                                            <td v-bind="props" :data-seen="seen.push(state)">
                                                <component :is="children" />
                                            </td>
                                        </template>
                                        <span data-calendar-part="label" />
                                    </Calendar.Day>
                                </template>
                            </Calendar.Week>
                        </Calendar.Weeks>
                    </Calendar.DayGrid>
                </Calendar.Root>`,
            props: ["model"],
        });
        const wrapper = mount(App, {
            props: { model },
            attachTo: document.body,
        });
        await flush();
        const today = seen.find((state) => state.day.today);
        expect(today?.day.date).toBe("2026-11-26");
        const cell = wrapper.element.querySelector('[data-date="2026-11-26"]');
        expect(cell?.tagName).toBe("TD");
        expect(cell?.getAttribute("role")).toBe("gridcell");
        expect(cell?.hasAttribute("data-today")).toBe(true);
        expect(
            cell?.querySelector('[data-calendar-part="label"]'),
        ).not.toBeNull();
        // the template ref the slot's props carry registered the cell: the arrows move from it
        (cell as HTMLElement).focus();
        expect(document.activeElement).toBe(cell);
    });

    it("gives a template ref the part's component, and composes listeners internal first", async () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const calls: string[] = [];
        const next = ref<{ $el: HTMLElement } | null>(null);
        const wrapper = mount(() =>
            h(Calendar.Root, { model }, () =>
                h(Calendar.Next, {
                    ref: next,
                    onClick: () => calls.push(model.state.view.anchorDate),
                }),
            ),
        );
        await flush();
        expect(next.value?.$el.tagName).toBe("BUTTON");
        await wrapper.get("button").trigger("click");
        // the primitive's own handler ran first: the consumer's sees the next month
        expect(calls).toEqual(["2026-12-01"]);
    });

    it("merges a plain class and style under the structural style, state through data-*", async () => {
        const model = modelOf([timed("t", "09:00", "10:00")], {
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        const App = defineComponent({
            components: COMPONENTS,
            props: ["model"],
            template: `
                <Calendar.Root :model="model" class="calendar" style="color: blue" data-testid="root">
                    <Calendar.ViewButton view="week" class="view" data-testid="week" />
                    <Calendar.TimeGrid>
                        <Calendar.Columns v-slot="{ column }">
                            <Calendar.Column :column="column">
                                <Calendar.ColumnEvents v-slot="{ segment }">
                                    <Calendar.TimeEvent :segment="segment" class="event" :style="{ top: '0px', color: 'red' }" />
                                </Calendar.ColumnEvents>
                            </Calendar.Column>
                        </Calendar.Columns>
                    </Calendar.TimeGrid>
                </Calendar.Root>`,
        });
        const wrapper = mount(App, { props: { model } });
        await flush();
        const root = wrapper.get('[data-testid="root"]').element as HTMLElement;
        expect(root.className).toBe("calendar");
        expect(root.style.color).toBe("blue");
        const button = wrapper.get('[data-testid="week"]').element;
        expect(button.className).toBe("view");
        expect(button.getAttribute("aria-pressed")).toBe("true");
        expect(button.hasAttribute("data-pressed")).toBe(true);
        const event = wrapper.get('[data-calendar-part="time-event"]')
            .element as HTMLElement;
        expect(event.className).toBe("event");
        // the structural `top` wins over the app's; its cosmetic `color` stays
        expect(event.style.top).toBe("37.5%");
        expect(event.style.color).toBe("red");
    });

    it("disables a navigation button whose command cannot run", async () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
            settings: {
                validRange: { start: "2026-11-01", end: "2026-12-01" },
            },
        });
        const wrapper = mount(() =>
            h(Calendar.Root, { model }, () =>
                h(Calendar.Previous, { "data-testid": "previous" }),
            ),
        );
        await nextTick();
        const previous = wrapper.get('[data-testid="previous"]')
            .element as HTMLButtonElement;
        expect(previous.disabled).toBe(true);
        expect(previous.hasAttribute("data-disabled")).toBe(true);
    });

    it("fails a part outside its root with a message naming it", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        expect(() => mount(Calendar.DayGrid)).toThrow(
            "Calendar.DayGrid must be rendered inside Calendar.Root",
        );
        warn.mockRestore();
    });
});

describe("the time grid's accessibility structure", () => {
    it("is rows of slots, a gridcell per day, each day's timed events a list", async () => {
        const model = modelOf(EVENTS, {
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        const wrapper = mount(() =>
            h(Calendar.Root, { model }, () => h(TimeGridView)),
        );
        await flush();
        const grid = wrapper.get('[role="grid"]').element;
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
        const column = wrapper.get(
            '[data-calendar-part="column"][data-date="2026-11-26"]',
        ).element;
        expect(column.getAttribute("role")).toBe("gridcell");
        expect(column.parentElement?.getAttribute("role")).toBe("row");
        const list = column.querySelector('[role="list"]');
        expect(list?.querySelectorAll('[role="listitem"]')).toHaveLength(1);
        // one tab stop: today's first slot
        expect(wrapper.element.querySelectorAll('[tabindex="0"]')).toHaveLength(
            1,
        );
        expect(
            wrapper.element
                .querySelector('[tabindex="0"]')
                ?.getAttribute("data-calendar-part"),
        ).toBe("slot");
    });
});

describe("a month's week numbers (week-number-column)", () => {
    it("numbers the columns, so the header row and the rows of eight agree", async () => {
        const model = modelOf(EVENTS, {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        // a bare attribute, as a template writes it
        const wrapper = mount(() =>
            h(Calendar.Root, { model, "week-number-column": "" }, () =>
                h(MonthGrid),
            ),
        );
        await flush();
        const grid = wrapper.get('[role="grid"]').element;
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
        const model = modelOf(EVENTS, {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const wrapper = mount(() =>
            h(Calendar.Root, { model }, () => h(MonthGrid)),
        );
        await flush();
        expect(
            wrapper.get('[role="grid"]').element.hasAttribute("aria-colcount"),
        ).toBe(false);
        const messages = warn.mock.calls.map(([message]) => String(message));
        expect(
            messages.filter((message) =>
                message.includes("week-number-column"),
            ),
        ).toHaveLength(1);
        warn.mockRestore();
    });
});
