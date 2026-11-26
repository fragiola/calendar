// Angular port of the Fragiola UI select (examples/react/src/components/ui/select.tsx): the same
// parts, `data-slot`s, classes and palette roles.
//
// Select — the recombination test. This component is field + popup + menu, and it declares no new
// style. Every class comes from a family:
//   - Trigger uses field.row (the box) + layout
//   - Content uses popup.content (the floating box)
//   - Item uses menu.selectableItem (the option with indicator space)
//   - ItemIndicator uses menu.itemIndicator
//
// What differs from the React one, and why:
//   - The root is a directive with no element of its own (`<ng-container kitSelect>`);
//     `value` / `onValueChange` are `[(value)]` (`[value]` + `(valueChange)`).
//   - The trigger is a `combobox` opening a `listbox` of `option`s (the APG select-only
//     combobox): Enter, Space and the arrows open it on the chosen option, the arrows and Home /
//     End move in it, Enter and Space choose, Escape and Tab close it, a press outside closes it.
//     State is Base UI's: `data-open` / `data-closed` on the list, `data-selected` and
//     `data-highlighted` on an option.
//   - `items` on the root (an array of `{ value, label }` or a record, as React's) gives
//     `kit-select-value` the label of the chosen value before the list was ever opened.
//   - Inside a `[kitField]` the trigger takes the field's id, so `label[kitFieldLabel]` names it.
//   - The list stays where it is declared (inside a dialog, its focus stays in the dialog) and is
//     placed fixed under the trigger.
//
//     <ng-container kitSelect [items]="CALENDARS" [(value)]="calendarId">
//         <button kitSelectTrigger><span kitSelectValue></span></button>
//         <kit-select-content>
//             <div kitSelectItem value="ada">Ada</div>
//         </kit-select-content>
//     </ng-container>

import {
    afterRenderEffect,
    Component,
    computed,
    contentChildren,
    DestroyRef,
    Directive,
    ElementRef,
    effect,
    forwardRef,
    inject,
    input,
    model,
    signal,
} from "@angular/core";
import { LucideCheck, LucideChevronDown } from "@lucide/angular";
import { field } from "#/components/families/field";
import { menu } from "#/components/families/menu";
import { popup } from "#/components/families/popup";
import { injectFieldControlId } from "#/components/ui/field";
import { place } from "#/components/ui/popover";
import { cn } from "#/lib/cn";

/** The options' labels, by value: an array of `{ value, label }` or a record, as Base UI takes. */
export type SelectItems =
    | readonly { value: string; label: string }[]
    | Readonly<Record<string, string>>;

let selects = 0;

/** The select's state: no element of its own. */
@Directive({ selector: "[kitSelect]", exportAs: "kitSelect" })
export class Select {
    readonly value = model<string | null>(null);
    readonly items = input<SelectItems>();
    readonly open = signal(false);
    readonly listId = `kit-select-${++selects}`;
    /** the trigger's element, set by `kitSelectTrigger` */
    readonly trigger = signal<HTMLElement | undefined>(undefined);
    /** the options, set by `kit-select-content` */
    readonly options = signal<readonly SelectItem[]>([]);
    /** the highlighted option's value */
    readonly highlighted = signal<string | null>(null);

    /** The chosen value's label, from `items` (else the option's text). */
    readonly label = computed(() => {
        const value = this.value();
        if (value === null) return undefined;
        const items = this.items();
        const label = Array.isArray(items)
            ? items.find((item) => item.value === value)?.label
            : (items as Readonly<Record<string, string>> | undefined)?.[value];
        return (
            label ??
            this.options()
                .find((option) => option.value() === value)
                ?.element.textContent?.trim()
        );
    });

    show() {
        this.highlighted.set(
            this.value() ?? this.options()[0]?.value() ?? null,
        );
        this.open.set(true);
    }

    hide(focusTrigger = true) {
        this.open.set(false);
        if (focusTrigger) this.trigger()?.focus({ preventScroll: true });
    }

    choose(value: string) {
        this.value.set(value);
        this.hide();
    }

    /** Moves the highlight by `step` options (`Infinity`: the last, `-Infinity`: the first). */
    move(step: number) {
        const options = this.options().map((option) => option.value());
        if (options.length === 0) return;
        const at = options.indexOf(this.highlighted() ?? "");
        const next =
            step === Infinity
                ? options.length - 1
                : step === -Infinity
                  ? 0
                  : Math.min(options.length - 1, Math.max(0, at + step));
        this.highlighted.set(options[next] ?? null);
    }

    onKeydown(event: KeyboardEvent) {
        const open = this.open();
        switch (event.key) {
            case "ArrowDown":
            case "ArrowUp":
                event.preventDefault();
                if (!open) this.show();
                else this.move(event.key === "ArrowDown" ? 1 : -1);
                return;
            case "Home":
            case "End":
                if (!open) return;
                event.preventDefault();
                this.move(event.key === "End" ? Infinity : -Infinity);
                return;
            case "Enter":
            case " ": {
                event.preventDefault();
                const highlighted = this.highlighted();
                if (!open) this.show();
                else if (highlighted !== null) this.choose(highlighted);
                return;
            }
            case "Escape":
                if (!open) return;
                event.preventDefault();
                event.stopPropagation();
                this.hide();
                return;
            case "Tab":
                if (open) this.hide(false);
                return;
        }
    }
}

function injectSelect(part: string): Select {
    const select = inject(Select, { optional: true });
    if (!select) throw new Error(`${part} must be inside [kitSelect]`);
    return select;
}

@Component({
    selector: "button[kitSelectTrigger]",
    imports: [LucideChevronDown],
    host: {
        type: "button",
        role: "combobox",
        "aria-haspopup": "listbox",
        "data-slot": "select-trigger",
        "[attr.id]": "id() ?? controlId",
        "[attr.aria-expanded]": "select.open()",
        "[attr.aria-controls]": "select.listId",
        "[attr.aria-activedescendant]":
            "select.open() && select.highlighted() !== null ? select.listId + '-' + select.highlighted() : null",
        "[attr.data-popup-open]": "select.open() ? '' : null",
        "[class]": "classes()",
        "(click)": "select.open() ? select.hide() : select.show()",
        "(keydown)": "select.onKeydown($event)",
    },
    template: `
        <ng-content />
        <svg lucideChevronDown aria-hidden="true" class="size-icon text-palette-accent/85"></svg>
    `,
})
export class SelectTrigger {
    readonly id = input<string>();
    readonly class = input<string>();
    protected readonly select = injectSelect("[kitSelectTrigger]");
    protected readonly controlId = injectFieldControlId();
    protected readonly classes = computed(() =>
        cn(
            field.row(),
            "flex-row items-center justify-between px-3 py-2",
            this.class(),
        ),
    );

    constructor() {
        this.select.trigger.set(inject(ElementRef).nativeElement);
    }
}

/** The chosen value's label (or the placeholder). */
@Directive({
    selector: "[kitSelectValue]",
    host: {
        "data-slot": "select-value",
        "[textContent]": "select.label() ?? placeholder() ?? ''",
        "[class]": "classes()",
    },
})
export class SelectValue {
    readonly placeholder = input<string>();
    readonly class = input<string>();
    protected readonly select = injectSelect("[kitSelectValue]");
    protected readonly classes = computed(() =>
        cn("text-sm text-palette-accent/85", this.class()),
    );
}

/** The list of options, under the trigger while the select is open. */
@Component({
    selector: "kit-select-content",
    host: {
        role: "listbox",
        tabindex: "-1",
        "data-slot": "select-content",
        "[id]": "select.listId",
        "[hidden]": "!select.open()",
        "[attr.data-open]": "select.open() ? '' : null",
        "[attr.data-closed]": "select.open() ? null : ''",
        "[class]": "classes()",
        "(keydown)": "select.onKeydown($event)",
    },
    template: "<ng-content />",
})
export class SelectContent {
    readonly sideOffset = input(4);
    readonly class = input<string>();
    readonly options = contentChildren(
        forwardRef(() => SelectItem),
        { descendants: true },
    );
    protected readonly select = injectSelect("kit-select-content");
    protected readonly classes = computed(() =>
        cn(popup.content("z-50 outline-none"), this.class()),
    );

    constructor() {
        const element: HTMLElement = inject(ElementRef).nativeElement;
        const document = element.ownerDocument;
        effect(() => this.select.options.set(this.options()));
        const outside = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (element.contains(target)) return;
            if (this.select.trigger()?.contains(target)) return;
            this.select.hide(false);
        };
        effect((cleanup) => {
            if (!this.select.open()) return;
            document.addEventListener("pointerdown", outside, true);
            cleanup(() =>
                document.removeEventListener("pointerdown", outside, true),
            );
        });
        afterRenderEffect(() => {
            const trigger = this.select.trigger();
            if (!this.select.open() || !trigger) return;
            element.style.minWidth = `${trigger.offsetWidth}px`;
            place(trigger, element, {
                side: "bottom",
                align: "start",
                sideOffset: this.sideOffset(),
                alignOffset: 0,
            });
            const highlighted = this.select.highlighted();
            this.options()
                .find((option) => option.value() === highlighted)
                ?.element.scrollIntoView({ block: "nearest" });
        });
        inject(DestroyRef).onDestroy(() =>
            document.removeEventListener("pointerdown", outside, true),
        );
    }
}

/** An option: a press chooses it. */
@Component({
    selector: "[kitSelectItem]",
    imports: [LucideCheck],
    host: {
        role: "option",
        "data-slot": "select-item",
        "[id]": "select.listId + '-' + value()",
        "[attr.aria-selected]": "selected()",
        "[attr.data-selected]": "selected() ? '' : null",
        "[attr.data-highlighted]":
            "select.highlighted() === value() ? '' : null",
        "[class]": "classes()",
        "(pointermove)": "select.highlighted.set(value())",
        "(click)": "select.choose(value())",
    },
    template: `
        <ng-content />
        @if (selected()) {
            <span data-slot="select-item-indicator" [class]="indicatorClasses">
                <svg lucideCheck aria-hidden="true"></svg>
            </span>
        }
    `,
})
export class SelectItem {
    // not `input.required`: the select reads every option's value, a sibling's maybe before
    // its inputs are set
    readonly value = input("");
    readonly class = input<string>();
    readonly element: HTMLElement = inject(ElementRef).nativeElement;
    protected readonly select = injectSelect("[kitSelectItem]");
    protected readonly selected = computed(
        () => this.select.value() === this.value(),
    );
    protected readonly classes = computed(() =>
        cn(menu.selectableItem(), this.class()),
    );
    protected readonly indicatorClasses = menu.itemIndicator();
}

/** Options under a label. */
@Directive({
    selector: "[kitSelectGroup]",
    host: { role: "group", "data-slot": "select-group" },
})
export class SelectGroup {}

@Directive({
    selector: "[kitSelectLabel]",
    host: { "data-slot": "select-label", "[class]": "classes()" },
})
export class SelectLabel {
    readonly class = input<string>();
    protected readonly classes = computed(() => cn(menu.label(), this.class()));
}

@Directive({
    selector: "[kitSelectSeparator]",
    host: {
        role: "separator",
        "data-slot": "select-separator",
        "[class]": "classes()",
    },
})
export class SelectSeparator {
    readonly class = input<string>();
    protected readonly classes = computed(() =>
        cn(menu.separator(), this.class()),
    );
}

/** Every part of a select, for a component's `imports`. */
export const SELECT = [
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    SelectGroup,
    SelectLabel,
    SelectSeparator,
] as const;
