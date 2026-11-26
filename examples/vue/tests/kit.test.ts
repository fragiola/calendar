// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { Input } from "#/components/atoms/fields";
import { Calendar as DatePicker } from "#/components/ui/calendar";
import { Checkbox } from "#/components/ui/checkbox";
import { Dialog } from "#/components/ui/dialog";
import { Field } from "#/components/ui/field";
import { Popover } from "#/components/ui/popover";
import { SegmentedControl } from "#/components/ui/segmented-control";
import { Select } from "#/components/ui/select";

// The Vue kit renders what the React kit does: the same roles, accessible names, `data-slot`s and
// `data-*` state (the shared e2e specs reach the examples through roles and names), and the dialog's
// portal comes and goes as the embed's overlay promotion expects.

beforeAll(() => {
    // what jsdom lacks and the primitives measure with
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    globalThis.PointerEvent ??= MouseEvent as typeof PointerEvent;
    Element.prototype.scrollIntoView ??= () => {};
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
});

const mounted: { unmount(): void }[] = [];
afterEach(() => {
    for (const wrapper of mounted.splice(0)) wrapper.unmount();
    document.body.innerHTML = "";
});

async function settle() {
    for (let i = 0; i < 4; i++) await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();
}

/** Mounts `render` into the page and waits for the portals to render. */
async function render(render: () => ReturnType<typeof h>) {
    const host = document.createElement("div");
    document.body.append(host);
    const wrapper = mount(defineComponent({ render }), { attachTo: host });
    mounted.push(wrapper);
    await settle();
    return wrapper;
}

const $ = (selector: string) => document.querySelector<HTMLElement>(selector);

describe("Dialog", () => {
    const open = ref(false);
    const dialog = () =>
        h(
            Dialog.Root,
            {
                open: open.value,
                "onUpdate:open": (next: boolean) => {
                    open.value = next;
                },
            },
            {
                default: () => [
                    h(Dialog.Trigger, null, { default: () => "Open" }),
                    h(Dialog.Portal, null, {
                        default: () => [
                            h(Dialog.Backdrop),
                            h(Dialog.Content, null, {
                                default: () => [
                                    h(Dialog.Header, null, {
                                        default: () => [
                                            h(Dialog.Title, null, {
                                                default: () => "New event",
                                            }),
                                            h(Dialog.Description, null, {
                                                default: () => "Tuesday",
                                            }),
                                        ],
                                    }),
                                    h(Dialog.Footer, null, {
                                        default: () =>
                                            h(
                                                Dialog.Close,
                                                { asChild: true },
                                                {
                                                    default: () =>
                                                        h(
                                                            Clickable.Button,
                                                            {
                                                                variant:
                                                                    "outline",
                                                            },
                                                            {
                                                                default: () =>
                                                                    "Cancel",
                                                            },
                                                        ),
                                                },
                                            ),
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            },
        );

    it("teleports a dialog-portal into <body> only while it is open", async () => {
        open.value = false;
        await render(dialog);
        expect($('[data-slot="dialog-trigger"]')?.textContent).toBe("Open");
        expect($('[data-slot="dialog-portal"]')).toBeNull();

        $('[data-slot="dialog-trigger"]')?.click();
        await settle();
        const portal = $('body > [data-slot="dialog-portal"]');
        expect(portal).not.toBeNull();
        const content = portal?.querySelector('[role="dialog"]');
        expect(content?.getAttribute("data-slot")).toBe("dialog-content");
        const title = portal?.querySelector('[data-slot="layer-title"]');
        expect(title?.tagName).toBe("H2");
        expect(content?.getAttribute("aria-labelledby")).toBe(title?.id);
        expect(
            portal?.querySelector('[data-slot="layer-backdrop"]'),
        ).not.toBeNull();

        const cancel = [...(portal?.querySelectorAll("button") ?? [])].find(
            (button) => button.textContent === "Cancel",
        );
        expect(cancel?.getAttribute("data-slot")).toBe("layer-close");
        cancel?.click();
        await settle();
        expect(open.value).toBe(false);
        expect($('[data-slot="dialog-portal"]')).toBeNull();
    });
});

describe("Field and Input", () => {
    it("names the input by its label, and v-model binds its text", async () => {
        const title = ref("");
        await render(() =>
            h(Field.Root, null, {
                default: () => [
                    h(Field.Label, null, { default: () => "Title" }),
                    h(Field.Row, null, {
                        default: () =>
                            h(Field.Body, null, {
                                default: () =>
                                    h(Input, {
                                        modelValue: title.value,
                                        "onUpdate:modelValue": (
                                            next: string,
                                        ) => {
                                            title.value = next;
                                        },
                                    }),
                            }),
                    }),
                ],
            }),
        );
        const input = $('[data-slot="input"]') as HTMLInputElement;
        expect($('[data-slot="field-label"]')?.getAttribute("for")).toBe(
            input.id,
        );
        input.value = "Design sync";
        input.dispatchEvent(new Event("input"));
        expect(title.value).toBe("Design sync");
    });
});

describe("Checkbox", () => {
    it("is a checkbox with Base UI's state attributes, named by its label", async () => {
        const checked = ref(true);
        await render(() =>
            h(Field.ChoiceRoot, null, {
                default: () => [
                    h(
                        Checkbox.Root,
                        {
                            checked: checked.value,
                            onCheckedChange: (next: boolean) => {
                                checked.value = next;
                            },
                        },
                        { default: () => h(Checkbox.Indicator) },
                    ),
                    h(Field.Label, null, { default: () => "Alan" }),
                ],
            }),
        );
        const box = $('[role="checkbox"]');
        expect(box?.getAttribute("data-slot")).toBe("checkbox");
        expect(box?.hasAttribute("data-checked")).toBe(true);
        expect($('[data-slot="field-label"]')?.getAttribute("for")).toBe(
            box?.id,
        );
        box?.click();
        await settle();
        expect(checked.value).toBe(false);
        expect(box?.hasAttribute("data-unchecked")).toBe(true);
    });
});

describe("SegmentedControl", () => {
    it("is a radio group whose checked radio is current", async () => {
        const zone = ref("ny");
        await render(() =>
            h(
                SegmentedControl.Root,
                {
                    "aria-label": "Display time zone",
                    modelValue: zone.value,
                    "onUpdate:modelValue": (next: string) => {
                        zone.value = next;
                    },
                },
                {
                    default: () =>
                        ["ny", "london"].map((value) =>
                            h(
                                SegmentedControl.Item,
                                { key: value, value },
                                { default: () => value },
                            ),
                        ),
                },
            ),
        );
        expect($('[role="radiogroup"]')?.getAttribute("aria-label")).toBe(
            "Display time zone",
        );
        const radios = document.querySelectorAll<HTMLElement>('[role="radio"]');
        expect(radios).toHaveLength(2);
        expect(radios[0]?.getAttribute("aria-checked")).toBe("true");
        expect(radios[0]?.hasAttribute("data-active")).toBe(true);
        radios[1]?.click();
        await settle();
        expect(zone.value).toBe("london");
        expect(radios[1]?.hasAttribute("data-active")).toBe(true);
    });
});

describe("Select", () => {
    it("shows the chosen item's label from `items` before it opens", async () => {
        await render(() =>
            h(
                Select.Root,
                { items: { ada: "Ada", alan: "Alan" }, modelValue: "alan" },
                {
                    default: () => [
                        h(Select.Trigger, null, {
                            default: () => h(Select.Value),
                        }),
                        h(Select.Content, null, {
                            default: () =>
                                h(
                                    Select.Item,
                                    { value: "ada" },
                                    { default: () => "Ada" },
                                ),
                        }),
                    ],
                },
            ),
        );
        expect($('[data-slot="select-trigger"]')?.textContent).toContain(
            "Alan",
        );
    });
});

describe("Popover", () => {
    it("is a dialog with Base UI's data-open, labelled by its title and described by its description", async () => {
        await render(() =>
            h(
                Popover.Root,
                { open: true },
                {
                    default: () => [
                        h(Popover.Trigger, null, { default: () => "+5 more" }),
                        h(Popover.Content, null, {
                            default: () => [
                                h(Popover.Title, null, {
                                    default: () => "Thursday, November 26",
                                }),
                                h(Popover.Description, null, {
                                    default: () => "7 events",
                                }),
                            ],
                        }),
                    ],
                },
            ),
        );
        const popup = $('[role="dialog"]');
        expect(popup?.getAttribute("data-slot")).toBe("popover-content");
        expect(popup?.hasAttribute("data-open")).toBe(true);
        const title = $('[data-slot="popover-title"]');
        expect(title?.tagName).toBe("H2");
        expect(title?.id).toBeTruthy();
        expect(popup?.getAttribute("aria-labelledby")).toBe(title?.id);
        expect(popup?.getAttribute("aria-describedby")).toBe(
            $('[data-slot="popover-description"]')?.id,
        );
    });
});

describe("Calendar (the date picker)", () => {
    it("shows the value's month as a grid, and a press picks a plain date", async () => {
        const picked: unknown[] = [];
        await render(() =>
            h(DatePicker.Template.Simple, {
                "aria-label": "Go to a date",
                locale: "en-US",
                value: { year: 2026, month: 11, day: 25 },
                onValueChange: (date: unknown) => picked.push(date),
            }),
        );
        expect($('[data-slot="calendar"]')?.getAttribute("aria-label")).toBe(
            "Go to a date",
        );
        expect($('[data-slot="calendar-heading"]')?.textContent).toBe(
            "November 2026",
        );
        const grid = $('[role="grid"]');
        expect(grid?.getAttribute("aria-labelledby")).toBe(
            $('[data-slot="calendar-heading"]')?.id,
        );
        expect(document.querySelectorAll("th")[0]?.textContent).toBe("Sun");
        const selected = $('[role="gridcell"][aria-selected="true"]');
        expect(selected?.getAttribute("aria-label")).toBe(
            "Wednesday, November 25, 2026",
        );
        expect(selected?.getAttribute("tabindex")).toBe("0");
        expect(
            selected
                ?.querySelector('[data-slot="calendar-item"]')
                ?.hasAttribute("data-checked"),
        ).toBe(true);
        const cell = [
            ...document.querySelectorAll<HTMLElement>('[role="gridcell"]'),
        ].find(
            (one) =>
                one.getAttribute("aria-label") === "Friday, November 27, 2026",
        );
        cell?.click();
        expect(picked).toEqual([{ year: 2026, month: 11, day: 27 }]);
        $('[data-slot="calendar-next-button"]')?.click();
        await settle();
        expect($('[data-slot="calendar-heading"]')?.textContent).toBe(
            "December 2026",
        );
    });

    it("keeps its page when the parent passes the same day as a new object", async () => {
        const renders = ref(0);
        await render(() =>
            h(DatePicker.Template.Simple, {
                locale: "en-US",
                "data-renders": renders.value,
                value: { year: 2026, month: 11, day: 25 },
            }),
        );
        $('[data-slot="calendar-next-button"]')?.click();
        await settle();
        renders.value++;
        await settle();
        expect($('[data-slot="calendar-heading"]')?.textContent).toBe(
            "December 2026",
        );
    });
});
