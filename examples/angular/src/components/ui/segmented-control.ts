// Angular port of the Fragiola UI segmented control (examples/react/src/components/ui/segmented-control.tsx):
// the same parts, `data-slot`s, classes and palette roles (the foundation's box, current, hover,
// focus and disabled members): a `radiogroup` of `radio` buttons, one tab stop, the arrows moving
// the focus and the check together (the APG radio group, as Fragiola Primitives'
// SegmentedControl).
//
// What differs from the React one, and why:
//   - `value` / `onValueChange` are `[(value)]` (`[value]` + `(valueChange)`).
//   - The root measures the checked item into the indicator's `--segment-indicator-*` variables
//     as Fragiola Primitives does (the item's box from the root's padding box, `inline-start` from
//     the right edge in RTL), again on a resize of either and on a change of the checked item.
//   - The checked item carries `data-active` (as React's `render` adds it), so `current:` lights
//     it, and `data-checked` / `data-unchecked`.
//
//     <div kitSegmentedControl aria-label="Zone" [value]="zone()" (valueChange)="show($event)">
//         <button kitSegmentedControlItem value="utc">UTC</button>
//     </div>

import {
    afterRenderEffect,
    booleanAttribute,
    Component,
    computed,
    contentChildren,
    DestroyRef,
    Directive,
    ElementRef,
    forwardRef,
    inject,
    input,
    model,
    signal,
} from "@angular/core";
import { foundation } from "#/components/families/foundation";
import { cn } from "#/lib/cn";

const INNER_RADIUS = "rounded-[max(0px,calc(var(--radius-control)-2px))]";

/** The checked item's box from the root's padding box, as the indicator's CSS variables. */
function indicatorBox(root: HTMLElement, item: HTMLElement) {
    const rtl = getComputedStyle(root).direction === "rtl";
    const rootRect = root.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const left = itemRect.left - rootRect.left - root.clientLeft;
    const top = itemRect.top - rootRect.top - root.clientTop;
    const right = root.clientWidth - left - itemRect.width;
    const bottom = root.clientHeight - top - itemRect.height;
    return {
        "--segment-indicator-inset-inline-start": `${rtl ? right : left}px`,
        "--segment-indicator-inset-block-start": `${top}px`,
        "--segment-indicator-inline-size": `${itemRect.width}px`,
        "--segment-indicator-block-size": `${itemRect.height}px`,
        "--segment-indicator-left": `${left}px`,
        "--segment-indicator-right": `${right}px`,
        "--segment-indicator-top": `${top}px`,
        "--segment-indicator-bottom": `${bottom}px`,
        "--segment-indicator-width": `${itemRect.width}px`,
        "--segment-indicator-height": `${itemRect.height}px`,
    };
}

/** A segment: a radio of the group. */
@Directive({
    selector: "button[kitSegmentedControlItem]",
    host: {
        type: "button",
        role: "radio",
        "data-slot": "segmented-control-item",
        "[attr.aria-checked]": "checked()",
        "[attr.tabindex]": "tabStop() ? 0 : -1",
        "[attr.data-checked]": "checked() ? '' : null",
        "[attr.data-unchecked]": "checked() ? null : ''",
        "[attr.data-active]": "checked() ? '' : null",
        "[attr.data-disabled]": "disabled() ? '' : null",
        "[disabled]": "disabled()",
        "[class]": "classes()",
        "(click)": "group.choose(value())",
    },
})
export class SegmentedControlItem {
    // not `input.required`: the group reads every item's value, a sibling's maybe before
    // its inputs are set
    readonly value = input("");
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly class = input<string>();
    readonly element: HTMLElement = inject(ElementRef).nativeElement;
    protected readonly group = inject(forwardRef(() => SegmentedControl));
    protected readonly checked = computed(
        () => this.group.value() === this.value(),
    );
    protected readonly tabStop = computed(() => this.group.tabStop() === this);
    protected readonly classes = computed(() =>
        cn(
            foundation.hover(),
            foundation.current(),
            foundation.focusInset(),
            foundation.disabled(),
            INNER_RADIUS,
            `
            current:bg-transparent
            inline-flex flex-1 cursor-pointer items-center justify-center
            gap-2 whitespace-nowrap px-3 text-sm text-palette-accent/85
            select-none transition-colors duration-150
            [&_svg:not([class*='size-'])]:size-icon
            `,
            this.class(),
        ),
    );
}

/** The group, and the indicator under its checked item. */
@Component({
    selector: "[kitSegmentedControl]",
    host: {
        role: "radiogroup",
        "data-slot": "segmented-control",
        "[class]": "classes()",
        "(keydown)": "onKeydown($event)",
    },
    template: `
        <ng-content />
        @if (box(); as style) {
            <span
                aria-hidden="true"
                data-slot="segmented-control-indicator"
                data-active=""
                [style]="style"
                [class]="indicatorClasses"
            ></span>
        }
    `,
})
export class SegmentedControl {
    readonly value = model<string | null>(null);
    readonly class = input<string>();
    readonly items = contentChildren(SegmentedControlItem);
    protected readonly box = signal<Record<string, string> | null>(null, {
        equal: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    });
    protected readonly classes = computed(() =>
        cn(
            foundation.box(),
            foundation.disabled(),
            `
            relative isolate inline-flex min-h-control w-fit
            items-stretch gap-0.5 rounded-control p-0.5
            data-[orientation=vertical]:flex-col
            `,
            this.class(),
        ),
    );
    protected readonly indicatorClasses = cn(
        foundation.current(),
        INNER_RADIUS,
        `
        absolute -z-10
        inset-s-(--segment-indicator-inset-inline-start)
        top-(--segment-indicator-inset-block-start)
        w-(--segment-indicator-inline-size)
        h-(--segment-indicator-block-size)
        transition-[inset-inline-start,top,width,height]
        duration-200 ease-out motion-reduce:transition-none
        `,
    );
    /** the item that takes the Tab: the checked one, else the first enabled */
    readonly tabStop = computed(() => {
        const enabled = this.items().filter((item) => !item.disabled());
        return (
            enabled.find((item) => item.value() === this.value()) ?? enabled[0]
        );
    });
    private readonly element: HTMLElement = inject(ElementRef).nativeElement;

    constructor() {
        const view = this.element.ownerDocument.defaultView;
        let observed: HTMLElement | undefined;
        const measure = () => {
            const checked = this.items().find(
                (item) => item.value() === this.value(),
            )?.element;
            this.box.set(checked ? indicatorBox(this.element, checked) : null);
            if (checked !== observed) {
                if (observed) resize?.unobserve(observed);
                if (checked) resize?.observe(checked);
                observed = checked;
            }
        };
        const resize = view?.ResizeObserver
            ? new view.ResizeObserver(() => measure())
            : undefined;
        resize?.observe(this.element);
        afterRenderEffect(() => {
            this.value();
            this.items();
            measure();
        });
        inject(DestroyRef).onDestroy(() => resize?.disconnect());
    }

    /** Checks an item (a press, or the arrows). */
    choose(value: string) {
        this.value.set(value);
    }

    protected onKeydown(event: KeyboardEvent) {
        const rtl = getComputedStyle(this.element).direction === "rtl";
        const step =
            event.key === "ArrowDown" ||
            event.key === (rtl ? "ArrowLeft" : "ArrowRight")
                ? 1
                : event.key === "ArrowUp" ||
                    event.key === (rtl ? "ArrowRight" : "ArrowLeft")
                  ? -1
                  : 0;
        if (step === 0) return;
        const enabled = this.items().filter((item) => !item.disabled());
        const current = enabled.findIndex(
            (item) => item.element === event.target,
        );
        const next =
            enabled[(current + step + enabled.length) % enabled.length];
        if (!next) return;
        event.preventDefault();
        next.element.focus();
        this.choose(next.value());
    }
}

/** A segment's text, truncated. */
@Directive({
    selector: "[kitSegmentedControlItemText]",
    host: {
        "data-slot": "segmented-control-item-text",
        "[class]": "classes()",
    },
})
export class SegmentedControlItemText {
    readonly class = input<string>();
    protected readonly classes = computed(() => cn("truncate", this.class()));
}

/** Every part of a segmented control, for a component's `imports`. */
export const SEGMENTED_CONTROL = [
    SegmentedControl,
    SegmentedControlItem,
    SegmentedControlItemText,
] as const;
