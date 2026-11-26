// @vitest-environment jsdom

import { Component, signal, type Type } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Button } from "#/components/atoms/clickable";
import { Input } from "#/components/atoms/fields";
import { DatePicker, type PlainDate } from "#/components/ui/calendar";
import { CHECKBOX } from "#/components/ui/checkbox";
import { DIALOG } from "#/components/ui/dialog";
import { FIELD_PARTS } from "#/components/ui/field";
import { POPOVER, type PopoverOpenChange } from "#/components/ui/popover";
import { SEGMENTED_CONTROL } from "#/components/ui/segmented-control";
import { SELECT } from "#/components/ui/select";

// The Angular kit renders what the React kit does: the same roles, accessible names, `data-slot`s
// and `data-*` state (the shared e2e specs reach the examples through roles and names), and the
// dialog's portal comes and goes as the embed's overlay promotion expects. Zoneless, as the app.

beforeAll(() => {
    // what jsdom lacks and the kit measures with
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    globalThis.PointerEvent ??= MouseEvent as typeof PointerEvent;
    Element.prototype.scrollIntoView ??= () => {};
});

const fixtures: ComponentFixture<unknown>[] = [];
afterEach(() => {
    for (const fixture of fixtures.splice(0)) fixture.destroy();
    document.body.innerHTML = "";
});

/** Renders a host component into the page and waits for its render. */
async function render<T>(component: Type<T>): Promise<ComponentFixture<T>> {
    const fixture = TestBed.createComponent(component);
    fixtures.push(fixture as ComponentFixture<unknown>);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return fixture;
}

async function settle(fixture: ComponentFixture<unknown>) {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
}

const $ = (selector: string) => document.querySelector<HTMLElement>(selector);

function key(element: Element | null, name: string) {
    element?.dispatchEvent(
        new KeyboardEvent("keydown", { key: name, bubbles: true }),
    );
}

describe("Dialog", () => {
    @Component({
        imports: [Button, DIALOG, FIELD_PARTS, Input],
        template: `
            <ng-template kitDialog [(open)]="open">
                <div kitDialogBackdrop></div>
                <kit-dialog-content>
                    <div kitDialogHeader>
                        <h2 kitDialogTitle>New event</h2>
                        <p kitDialogDescription>Tuesday</p>
                    </div>
                    <div kitField>
                        <label kitFieldLabel>Title</label>
                        <input kitInput autofocus />
                    </div>
                    <div kitDialogFooter>
                        <button kitButton variant="outline" kitDialogClose>Cancel</button>
                    </div>
                </kit-dialog-content>
            </ng-template>
        `,
    })
    class Host {
        readonly open = signal(false);
    }

    it("renders a dialog-portal in <body> only while it is open", async () => {
        const fixture = await render(Host);
        expect($('[data-slot="dialog-portal"]')).toBeNull();
        fixture.componentInstance.open.set(true);
        await settle(fixture);
        const portal = $('[data-slot="dialog-portal"]');
        expect(portal?.parentElement).toBe(document.body);
        const dialog = portal?.querySelector('[role="dialog"]');
        expect(dialog?.getAttribute("data-slot")).toBe("dialog-content");
        expect(dialog?.getAttribute("aria-modal")).toBe("true");
        expect(
            document.getElementById(
                dialog?.getAttribute("aria-labelledby") ?? "",
            )?.textContent,
        ).toBe("New event");
        expect(
            document.getElementById(
                dialog?.getAttribute("aria-describedby") ?? "",
            )?.textContent,
        ).toBe("Tuesday");
        expect(portal?.querySelector('[data-slot="layer-backdrop"]')).not.toBe(
            null,
        );
        $('[data-slot="clickable-button"][aria-label="Close"]')?.click();
        await settle(fixture);
        expect(fixture.componentInstance.open()).toBe(false);
        expect($('[data-slot="dialog-portal"]')).toBeNull();
    });

    it("focuses its [autofocus] element, and closes on Escape and on Cancel", async () => {
        const fixture = await render(Host);
        fixture.componentInstance.open.set(true);
        await settle(fixture);
        const input = $('[data-slot="input"]');
        expect(document.activeElement).toBe(input);
        key(input, "Escape");
        await settle(fixture);
        expect(fixture.componentInstance.open()).toBe(false);
        fixture.componentInstance.open.set(true);
        await settle(fixture);
        [...document.querySelectorAll<HTMLElement>("button")]
            .find((button) => button.textContent === "Cancel")
            ?.click();
        await settle(fixture);
        expect($('[data-slot="dialog-portal"]')).toBeNull();
    });
});

describe("Field and Input", () => {
    it("names the input by its label, and [(value)] binds its text", async () => {
        @Component({
            imports: [FIELD_PARTS, Input],
            template: `
                <div kitField>
                    <label kitFieldLabel>Title</label>
                    <div kitFieldRow><div kitFieldBody><input kitInput [(value)]="title" /></div></div>
                </div>
            `,
        })
        class Host {
            readonly title = signal("Standup");
        }
        const fixture = await render(Host);
        const input = $('[data-slot="input"]') as HTMLInputElement;
        const label = $('[data-slot="field-label"]') as HTMLLabelElement;
        expect(label.htmlFor).toBe(input.id);
        expect(input.id).toBeTruthy();
        expect(input.value).toBe("Standup");
        input.value = "Retro";
        input.dispatchEvent(new Event("input"));
        expect(fixture.componentInstance.title()).toBe("Retro");
        expect($('[data-slot="field-row"]')).not.toBeNull();
    });
});

describe("Checkbox", () => {
    it("is a checkbox with Base UI's state attributes, named by its label", async () => {
        @Component({
            imports: [CHECKBOX, FIELD_PARTS],
            template: `
                <div kitFieldChoice>
                    <button kitCheckbox [(checked)]="checked"><span kitCheckboxIndicator></span></button>
                    <label kitFieldLabel>Alan</label>
                </div>
            `,
        })
        class Host {
            readonly checked = signal(true);
        }
        const fixture = await render(Host);
        const box = $('[role="checkbox"]');
        expect(box?.getAttribute("aria-checked")).toBe("true");
        expect(box?.hasAttribute("data-checked")).toBe(true);
        expect(
            ($('[data-slot="field-label"]') as HTMLLabelElement).htmlFor,
        ).toBe(box?.id);
        expect(
            $('[data-slot="checkbox-indicator"]')?.hasAttribute("hidden"),
        ).toBe(false);
        box?.click();
        await settle(fixture);
        expect(fixture.componentInstance.checked()).toBe(false);
        expect(box?.getAttribute("aria-checked")).toBe("false");
        expect(box?.hasAttribute("data-unchecked")).toBe(true);
        expect(
            $('[data-slot="checkbox-indicator"]')?.hasAttribute("hidden"),
        ).toBe(true);
    });
});

describe("SegmentedControl", () => {
    @Component({
        imports: [SEGMENTED_CONTROL],
        template: `
            <div kitSegmentedControl aria-label="Zone" [(value)]="zone">
                <button kitSegmentedControlItem value="ny">New York</button>
                <button kitSegmentedControlItem value="london">London</button>
                <button kitSegmentedControlItem value="tokyo">Tokyo</button>
            </div>
        `,
    })
    class Host {
        readonly zone = signal<string | null>("ny");
    }

    it("is a radio group whose checked radio is current and the one tab stop", async () => {
        const fixture = await render(Host);
        const group = $('[role="radiogroup"]');
        expect(group?.getAttribute("data-slot")).toBe("segmented-control");
        const radios = [
            ...document.querySelectorAll<HTMLElement>('[role="radio"]'),
        ];
        expect(
            radios.map((radio) => radio.getAttribute("aria-checked")),
        ).toEqual(["true", "false", "false"]);
        expect(radios.map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);
        expect(radios[0]?.hasAttribute("data-active")).toBe(true);
        radios[1]?.click();
        await settle(fixture);
        expect(fixture.componentInstance.zone()).toBe("london");
        expect(radios[1]?.getAttribute("aria-checked")).toBe("true");
        expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, 0, -1]);
    });

    it("moves the check and the focus with the arrows, wrapping", async () => {
        const fixture = await render(Host);
        const radios = [
            ...document.querySelectorAll<HTMLElement>('[role="radio"]'),
        ];
        radios[0]?.focus();
        key(radios[0] ?? null, "ArrowLeft");
        await settle(fixture);
        expect(fixture.componentInstance.zone()).toBe("tokyo");
        expect(document.activeElement).toBe(radios[2]);
        key(radios[2] ?? null, "ArrowRight");
        await settle(fixture);
        expect(fixture.componentInstance.zone()).toBe("ny");
    });
});

describe("Select", () => {
    @Component({
        imports: [FIELD_PARTS, SELECT],
        template: `
            <div kitField>
                <label kitFieldLabel>Calendar</label>
                <ng-container kitSelect [items]="items" [(value)]="value">
                    <button kitSelectTrigger><span kitSelectValue></span></button>
                    <kit-select-content>
                        <div kitSelectItem value="ada">Ada</div>
                        <div kitSelectItem value="alan">Alan</div>
                    </kit-select-content>
                </ng-container>
            </div>
        `,
    })
    class Host {
        readonly items = { ada: "Ada", alan: "Alan" };
        readonly value = signal<string | null>("alan");
    }

    it("shows the chosen item's label from `items` before it opens, named by its label", async () => {
        await render(Host);
        const trigger = $('[role="combobox"]');
        expect(trigger?.getAttribute("aria-expanded")).toBe("false");
        expect($('[data-slot="select-value"]')?.textContent).toBe("Alan");
        expect(
            ($('[data-slot="field-label"]') as HTMLLabelElement).htmlFor,
        ).toBe(trigger?.id);
        expect($('[role="listbox"]')?.hasAttribute("hidden")).toBe(true);
    });

    it("opens a listbox on a press, and a press on an option chooses it", async () => {
        const fixture = await render(Host);
        const trigger = $('[role="combobox"]');
        trigger?.click();
        await settle(fixture);
        expect(trigger?.getAttribute("aria-expanded")).toBe("true");
        const list = $('[role="listbox"]');
        expect(list?.hasAttribute("data-open")).toBe(true);
        const options = [
            ...document.querySelectorAll<HTMLElement>('[role="option"]'),
        ];
        expect(options[1]?.getAttribute("aria-selected")).toBe("true");
        expect(
            options[1]?.querySelector('[data-slot="select-item-indicator"]'),
        ).not.toBeNull();
        options[0]?.click();
        await settle(fixture);
        expect(fixture.componentInstance.value()).toBe("ada");
        expect(list?.hasAttribute("hidden")).toBe(true);
        expect($('[data-slot="select-value"]')?.textContent).toBe("Ada");
    });

    it("chooses from the keyboard: Down opens on the chosen option, Up moves, Enter picks", async () => {
        const fixture = await render(Host);
        const trigger = $('[role="combobox"]');
        key(trigger, "ArrowDown");
        await settle(fixture);
        expect(trigger?.getAttribute("aria-activedescendant")).toMatch(
            /-alan$/,
        );
        key(trigger, "ArrowUp");
        await settle(fixture);
        key(trigger, "Enter");
        await settle(fixture);
        expect(fixture.componentInstance.value()).toBe("ada");
        expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    });
});

describe("Popover", () => {
    @Component({
        imports: [POPOVER],
        template: `
            <ng-container kitPopover [open]="open()" (openChange)="changes.push($event)">
                <button kitPopoverTrigger>Details</button>
                <kit-popover-content align="start" [sideOffset]="4">
                    <h2 kitPopoverTitle>Thursday</h2>
                    <p kitPopoverDescription>Seven events</p>
                </kit-popover-content>
            </ng-container>
        `,
    })
    class Host {
        readonly open = signal(false);
        readonly changes: PopoverOpenChange[] = [];
    }

    it("is a dialog in <body> with Base UI's data-open, labelled by its title and described by its description", async () => {
        const fixture = await render(Host);
        const popup = $('[data-slot="popover-content"]');
        expect(popup?.hasAttribute("hidden")).toBe(true);
        expect(popup?.hasAttribute("data-closed")).toBe(true);
        fixture.componentInstance.open.set(true);
        await settle(fixture);
        expect(popup?.parentElement).toBe(document.body);
        expect(popup?.getAttribute("role")).toBe("dialog");
        expect(popup?.hasAttribute("data-open")).toBe(true);
        expect(popup?.getAttribute("data-side")).toBe("bottom");
        const title = $('[data-slot="popover-title"]');
        expect(title?.tagName).toBe("H2");
        expect(popup?.getAttribute("aria-labelledby")).toBe(title?.id);
        expect(popup?.getAttribute("aria-describedby")).toBe(
            $('[data-slot="popover-description"]')?.id,
        );
        expect(
            $('[data-slot="popover-trigger"]')?.getAttribute("aria-expanded"),
        ).toBe("true");
    });

    it("says why it asks to change: the trigger's press, Escape, a press outside", async () => {
        const fixture = await render(Host);
        const changes = fixture.componentInstance.changes;
        $('[data-slot="popover-trigger"]')?.click();
        expect(changes).toEqual([{ open: true, reason: "trigger-press" }]);
        fixture.componentInstance.open.set(true);
        await settle(fixture);
        $('[data-slot="popover-trigger"]')?.click();
        key($('[data-slot="popover-content"]'), "Escape");
        document.body.dispatchEvent(
            new PointerEvent("pointerdown", { bubbles: true }),
        );
        expect(changes.slice(1)).toEqual([
            { open: false, reason: "trigger-press" },
            { open: false, reason: "escape-key" },
            { open: false, reason: "outside-press" },
        ]);
    });
});

describe("DatePicker", () => {
    it("shows the value's month as a grid, and a press picks a plain date", async () => {
        @Component({
            imports: [DatePicker],
            template: `
                <kit-date-picker
                    aria-label="Go to a date"
                    locale="en-US"
                    [value]="value"
                    (valueChange)="picked.push($event)"
                />
            `,
        })
        class Host {
            readonly value: PlainDate = { year: 2026, month: 11, day: 25 };
            readonly picked: (PlainDate | null)[] = [];
        }
        const fixture = await render(Host);
        expect($('[data-slot="calendar"]')?.getAttribute("aria-label")).toBe(
            "Go to a date",
        );
        expect($('[data-slot="calendar-heading"]')?.textContent).toBe(
            "November 2026",
        );
        expect($('[role="grid"]')?.getAttribute("aria-labelledby")).toBe(
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
        $('[role="gridcell"][aria-label="Friday, November 27, 2026"]')?.click();
        expect(fixture.componentInstance.picked).toEqual([
            { year: 2026, month: 11, day: 27 },
        ]);
        $('[data-slot="calendar-next-button"]')?.click();
        await settle(fixture);
        expect($('[data-slot="calendar-heading"]')?.textContent).toBe(
            "December 2026",
        );
    });

    it("keeps its page when the parent passes the same day as a new object", async () => {
        @Component({
            imports: [DatePicker],
            template: `<kit-date-picker locale="en-US" [value]="value()" />`,
        })
        class Host {
            readonly value = signal<PlainDate>({
                year: 2026,
                month: 11,
                day: 25,
            });
        }
        const fixture = await render(Host);
        $('[data-slot="calendar-next-button"]')?.click();
        await settle(fixture);
        fixture.componentInstance.value.set({ year: 2026, month: 11, day: 25 });
        await settle(fixture);
        expect($('[data-slot="calendar-heading"]')?.textContent).toBe(
            "December 2026",
        );
    });

    it("moves the focus by a week with Down, into the next month", async () => {
        @Component({
            imports: [DatePicker],
            template: `<kit-date-picker locale="en-US" [value]="value" />`,
        })
        class Host {
            readonly value: PlainDate = { year: 2026, month: 11, day: 25 };
        }
        const fixture = await render(Host);
        key($('[role="grid"]'), "ArrowDown");
        await settle(fixture);
        expect($('[data-slot="calendar-heading"]')?.textContent).toBe(
            "December 2026",
        );
        expect(document.activeElement?.getAttribute("aria-label")).toBe(
            "Wednesday, December 2, 2026",
        );
    });
});
