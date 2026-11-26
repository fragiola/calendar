// Angular port of the Fragiola UI popover (examples/react/src/components/ui/popover.tsx): the same
// parts, `data-slot`s, classes and palette roles (the `popup` family).
//
// What differs from the React one, and why:
//   - The root is a directive with no element of its own (`<ng-container kitPopover>`), the
//     trigger a directive on your element (`kitPopoverTrigger`, React's `render`), the content a
//     component whose element is the popup: it moves to <body> while open (the portal) and is
//     placed against the trigger there, as Base UI's positioner (`side`, `align`, their offsets,
//     5px of collision padding, `--available-height`); closed, it is hidden in place.
//   - `open` / `onOpenChange` are `[open]` + `(openChange)`, which tells the new state and why, as
//     Base UI's change details: `trigger-press` (the trigger toggles it), `escape-key`,
//     `outside-press`, `close-press`. Ignore a reason to keep the popover as it is (React's
//     `eventDetails.cancel()`).
//   - The popup is a `dialog` with Base UI's `data-open` / `data-closed`, named by its
//     `[kitPopoverTitle]` and described by its `[kitPopoverDescription]`; it focuses its first
//     tabbable element as it opens, and gives the focus back to the trigger on Escape.
//
//     <ng-container kitPopover [open]="open()" (openChange)="onOpenChange($event)">
//         <button kitPopoverTrigger>Details</button>
//         <kit-popover-content align="start" [sideOffset]="4">
//             <h2 kitPopoverTitle>Details</h2>
//         </kit-popover-content>
//     </ng-container>

import {
    afterRenderEffect,
    booleanAttribute,
    Component,
    computed,
    DestroyRef,
    Directive,
    ElementRef,
    effect,
    inject,
    input,
    output,
    signal,
    untracked,
} from "@angular/core";
import { LucideX } from "@lucide/angular";
import { Button } from "#/components/atoms/clickable";
import { headingClass, text } from "#/components/atoms/text";
import { popup } from "#/components/families/popup";
import { cn } from "#/lib/cn";

/** Why the popover asks to open or close (Base UI's reasons). */
export type PopoverChangeReason =
    | "trigger-press"
    | "escape-key"
    | "outside-press"
    | "close-press";

/** What `(openChange)` tells. */
export interface PopoverOpenChange {
    open: boolean;
    reason: PopoverChangeReason;
}

/** Where a floating box goes against its anchor. */
export interface Placement {
    side: "top" | "bottom";
    align: "start" | "center" | "end";
    sideOffset: number;
    alignOffset: number;
}

/** Base UI's collision padding (POSITIONER_DEFAULTS). */
const PADDING = 5;

/**
 * Places `floating` (fixed) against `anchor`: on its side (the other one when it does not fit),
 * aligned on the inline axis (the writing direction's start), kept `PADDING` inside the viewport.
 * Sets `data-side` and `--available-height`, which the `popup` family reads.
 */
export function place(
    anchor: HTMLElement,
    floating: HTMLElement,
    placement: Placement,
) {
    const view = floating.ownerDocument.defaultView;
    if (!view) return;
    const box = anchor.getBoundingClientRect();
    const rtl = view.getComputedStyle(anchor).direction === "rtl";
    floating.style.position = "fixed";
    floating.style.top = "0px";
    floating.style.left = "0px";
    const size = floating.getBoundingClientRect();
    const below = view.innerHeight - box.bottom - placement.sideOffset;
    const above = box.top - placement.sideOffset;
    const side =
        placement.side === "bottom"
            ? below < size.height && above > below
                ? "top"
                : "bottom"
            : above < size.height && below > above
              ? "bottom"
              : "top";
    const start = rtl ? box.right - size.width : box.left;
    const end = rtl ? box.left : box.right - size.width;
    const center = box.left + (box.width - size.width) / 2;
    const offset = (rtl ? -1 : 1) * placement.alignOffset;
    const left =
        (placement.align === "start"
            ? start
            : placement.align === "end"
              ? end
              : center) + offset;
    const top =
        side === "bottom"
            ? box.bottom + placement.sideOffset
            : box.top - placement.sideOffset - size.height;
    const clamp = (value: number, max: number) =>
        Math.max(PADDING, Math.min(value, max - PADDING));
    floating.style.left = `${clamp(left, view.innerWidth - size.width)}px`;
    floating.style.top = `${Math.max(PADDING, top)}px`;
    floating.style.setProperty(
        "--available-height",
        `${Math.max(0, (side === "bottom" ? below : above) - PADDING)}px`,
    );
    floating.style.setProperty(
        "--transform-origin",
        `${placement.align === "end" ? "100%" : placement.align === "center" ? "50%" : "0"} ${side === "bottom" ? "0" : "100%"}`,
    );
    floating.setAttribute("data-side", side);
    floating.setAttribute("data-align", placement.align);
}

let popovers = 0;

/** The popover's state: no element of its own. */
@Directive({ selector: "[kitPopover]", exportAs: "kitPopover" })
export class Popover {
    readonly open = input(false, { transform: booleanAttribute });
    readonly openChange = output<PopoverOpenChange>();
    readonly contentId = `kit-popover-${++popovers}`;
    /** the trigger's element, set by `kitPopoverTrigger` */
    readonly trigger = signal<HTMLElement | undefined>(undefined);
    readonly titleId = signal<string | undefined>(undefined);
    readonly descriptionId = signal<string | undefined>(undefined);

    /** Asks for another state. */
    change(open: boolean, reason: PopoverChangeReason) {
        if (open !== this.open()) this.openChange.emit({ open, reason });
    }
}

function injectPopover(part: string): Popover {
    const popover = inject(Popover, { optional: true });
    if (!popover) throw new Error(`${part} must be inside [kitPopover]`);
    return popover;
}

/** The element the popover opens from: a press toggles it. */
@Directive({
    selector: "[kitPopoverTrigger]",
    host: {
        "data-slot": "popover-trigger",
        "aria-haspopup": "dialog",
        "[attr.aria-expanded]": "popover.open()",
        "[attr.aria-controls]": "popover.open() ? popover.contentId : null",
        "[attr.data-popup-open]": "popover.open() ? '' : null",
        "(click)": "popover.change(!popover.open(), 'trigger-press')",
    },
})
export class PopoverTrigger {
    protected readonly popover = injectPopover("[kitPopoverTrigger]");

    constructor() {
        const element: HTMLElement = inject(ElementRef).nativeElement;
        this.popover.trigger.set(element);
        inject(DestroyRef).onDestroy(() => {
            if (untracked(this.popover.trigger) === element) {
                this.popover.trigger.set(undefined);
            }
        });
    }
}

const TABBABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The popup: in <body>, against the trigger, while the popover is open. */
@Component({
    selector: "kit-popover-content",
    imports: [Button, LucideX],
    host: {
        role: "dialog",
        tabindex: "-1",
        "data-slot": "popover-content",
        "[id]": "popover.contentId",
        "[hidden]": "!popover.open()",
        "[attr.data-open]": "popover.open() ? '' : null",
        "[attr.data-closed]": "popover.open() ? null : ''",
        "[attr.aria-labelledby]": "popover.titleId()",
        "[attr.aria-describedby]": "popover.descriptionId()",
        "[class]": "classes()",
        "(keydown.escape)": "escape($event)",
    },
    template: `
        @if (showClose()) {
            <button
                kitButton
                variant="icon"
                shape="square"
                size="sm"
                aria-label="Close"
                class="absolute top-4 end-4"
                (click)="popover.change(false, 'close-press')"
            >
                <svg lucideX aria-hidden="true"></svg>
            </button>
        }
        <ng-content />
    `,
})
export class PopoverContent {
    readonly showClose = input(true, { transform: booleanAttribute });
    readonly align = input<Placement["align"]>("center");
    readonly alignOffset = input(0);
    readonly side = input<Placement["side"]>("bottom");
    readonly sideOffset = input(0);
    readonly class = input<string>();
    protected readonly popover = injectPopover("kit-popover-content");
    protected readonly classes = computed(() =>
        cn(popup.content("z-50 outline-none"), this.class()),
    );
    private readonly element: HTMLElement = inject(ElementRef).nativeElement;

    constructor() {
        const document = this.element.ownerDocument;
        const view = document.defaultView;
        const replace = () => {
            const trigger = this.popover.trigger();
            if (trigger && this.popover.open()) {
                place(trigger, this.element, {
                    side: this.side(),
                    align: this.align(),
                    sideOffset: this.sideOffset(),
                    alignOffset: this.alignOffset(),
                });
            }
        };
        const outside = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (this.element.contains(target)) return;
            if (this.popover.trigger()?.contains(target)) return;
            this.popover.change(false, "outside-press");
        };
        effect((cleanup) => {
            if (!this.popover.open()) return;
            // the portal: the popup leaves the day it was declared in for <body>
            document.body.append(this.element);
            document.addEventListener("pointerdown", outside, true);
            view?.addEventListener("resize", replace);
            view?.addEventListener("scroll", replace, true);
            cleanup(() => {
                document.removeEventListener("pointerdown", outside, true);
                view?.removeEventListener("resize", replace);
                view?.removeEventListener("scroll", replace, true);
            });
        });
        let wasOpen = false;
        afterRenderEffect(() => {
            const open = this.popover.open();
            if (open) replace();
            if (open && !wasOpen) {
                (
                    this.element.querySelector<HTMLElement>(TABBABLE) ??
                    this.element
                ).focus({ preventScroll: true });
            }
            wasOpen = open;
        });
        // the popup lives in <body> once opened: it leaves with the popover
        inject(DestroyRef).onDestroy(() => this.element.remove());
    }

    protected escape(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this.popover.change(false, "escape-key");
        this.popover.trigger()?.focus({ preventScroll: true });
    }
}

/** The popup's heading: it names the popup. */
@Directive({
    selector: "[kitPopoverTitle]",
    host: {
        "data-slot": "popover-title",
        "[id]": "id",
        "[class]": "classes()",
    },
})
export class PopoverTitle {
    readonly class = input<string>();
    protected readonly id = `kit-popover-title-${++popovers}`;
    protected readonly classes = computed(() =>
        headingClass("h2", "text-palette-contrast", this.class()),
    );

    constructor() {
        const popover = injectPopover("[kitPopoverTitle]");
        popover.titleId.set(this.id);
        inject(DestroyRef).onDestroy(() => popover.titleId.set(undefined));
    }
}

/** The popup's text: it describes the popup. */
@Directive({
    selector: "[kitPopoverDescription]",
    host: {
        "data-slot": "popover-description",
        "[id]": "id",
        "[class]": "classes()",
    },
})
export class PopoverDescription {
    readonly class = input<string>();
    protected readonly id = `kit-popover-description-${++popovers}`;
    protected readonly classes = computed(() =>
        cn(text.paragraph, "text-palette-accent/85", this.class()),
    );

    constructor() {
        const popover = injectPopover("[kitPopoverDescription]");
        popover.descriptionId.set(this.id);
        inject(DestroyRef).onDestroy(() =>
            popover.descriptionId.set(undefined),
        );
    }
}

/** Closes the popover on a press: on your button. */
@Directive({
    selector: "[kitPopoverClose]",
    host: {
        "data-slot": "popover-close",
        "(click)": "popover.change(false, 'close-press')",
    },
})
export class PopoverClose {
    protected readonly popover = injectPopover("[kitPopoverClose]");
}

/** Every part of a popover, for a component's `imports`. */
export const POPOVER = [
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverTitle,
    PopoverDescription,
    PopoverClose,
] as const;
