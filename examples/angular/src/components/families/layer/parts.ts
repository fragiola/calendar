// Angular port of the Fragiola UI layer parts (examples/react/src/components/families/layer/parts.tsx):
// the parts a dialog is made of (backdrop, content, header, body, footer, title, description,
// close) with the `layer` family's classes and the React kit's `data-slot`s. The layer they act on
// (closing it, its title's and description's ids) is the `LAYER` its root provides
// (ui/dialog.ts); the Angular kit has no alert dialog, so the selectors are the dialog's.
//
// What differs from the React one, and why:
//   - Fragiola Primitives marks the opening with `data-starting-style` (the transition's starting
//     values, removed on the next frame). The backdrop and the content set it as they are created
//     and drop it two frames later, so the layer fades (and the dialog scales) in as React's.
//     There is no `data-ending-style`: the dialog leaves the DOM as it closes (ui/dialog.ts).
//   - The content is the modal's behaviour as Base UI's: `role="dialog"`, `aria-modal`, named by
//     its title and described by its description; it focuses its `[autofocus]` element as it
//     opens (else its first tabbable element), keeps Tab inside it, closes on Escape, and gives
//     the focus back to what had it once it closes.
//   - React's `render={<Clickable.Button variant="outline" />}` on `Close` is the close directive
//     on your button: `<button kitButton variant="outline" kitDialogClose>Cancel</button>`.

import {
    afterNextRender,
    booleanAttribute,
    Component,
    computed,
    DestroyRef,
    Directive,
    ElementRef,
    InjectionToken,
    inject,
    input,
    signal,
} from "@angular/core";
import { LucideX } from "@lucide/angular";
import { Button } from "#/components/atoms/clickable";
import { headingClass, text } from "#/components/atoms/text";
import { layer } from "#/components/families/layer";
import { cn } from "#/lib/cn";

/** The open layer the parts act on, provided by its root. */
export interface LayerContext {
    /** closes the layer (its root's `openChange` says so) */
    close(): void;
    titleId: string;
    descriptionId: string;
}

export const LAYER = new InjectionToken<LayerContext>("kit-layer");

function injectLayer(part: string): LayerContext {
    const context = inject(LAYER, { optional: true });
    if (!context) throw new Error(`${part} must be inside a [kitDialog]`);
    return context;
}

/**
 * Base UI's `data-starting-style`: present from the part's creation to the second frame after its
 * first render, so a CSS transition runs from the starting values to the resting ones.
 */
export function startingStyle() {
    const starting = signal(true);
    let frame = 0;
    afterNextRender(() => {
        frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => starting.set(false));
        });
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(frame));
    return computed(() => (starting() ? "" : null));
}

const TABBABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Directive({
    selector: "[kitDialogBackdrop]",
    host: {
        role: "presentation",
        "data-slot": "layer-backdrop",
        "[attr.data-starting-style]": "starting()",
        "[class]": "classes()",
    },
})
export class LayerBackdrop {
    readonly class = input<string>();
    protected readonly starting = startingStyle();
    protected readonly classes = computed(() =>
        cn(layer.backdrop(), this.class()),
    );
}

@Component({
    selector: "[kitLayerContent]",
    imports: [Button, LucideX],
    host: {
        role: "dialog",
        "aria-modal": "true",
        tabindex: "-1",
        "[attr.data-slot]": "slot()",
        "[attr.aria-labelledby]": "layer.titleId",
        "[attr.aria-describedby]": "layer.descriptionId",
        "[attr.data-starting-style]": "starting()",
        "[class]": "classes()",
        "(keydown)": "onKeydown($event)",
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
                (click)="layer.close()"
            >
                <svg lucideX aria-hidden="true"></svg>
            </button>
        }
        <ng-content />
    `,
})
export class LayerContent {
    /** whether to render the close affordance */
    readonly showClose = input(true, { transform: booleanAttribute });
    readonly slot = input("layer-content");
    readonly class = input<string>();
    protected readonly layer = injectLayer("[kitLayerContent]");
    protected readonly starting = startingStyle();
    protected readonly classes = computed(() =>
        cn(
            layer.panel(),
            "duration-200 data-starting-style:scale-95 data-ending-style:scale-95",
            this.class(),
        ),
    );
    private readonly element: HTMLElement = inject(ElementRef).nativeElement;

    constructor() {
        const previous = this.element.ownerDocument.activeElement;
        afterNextRender(() => {
            const first =
                this.element.querySelector<HTMLElement>("[autofocus]") ??
                this.element.querySelector<HTMLElement>(TABBABLE) ??
                this.element;
            first.focus();
        });
        inject(DestroyRef).onDestroy(() => {
            if (previous instanceof HTMLElement && previous.isConnected) {
                previous.focus({ preventScroll: true });
            }
        });
    }

    protected onKeydown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            this.layer.close();
            return;
        }
        if (event.key !== "Tab") return;
        // the focus stays inside the modal
        const tabbable = [
            ...this.element.querySelectorAll<HTMLElement>(TABBABLE),
        ];
        const first = tabbable[0];
        const last = tabbable[tabbable.length - 1];
        const active = this.element.ownerDocument.activeElement;
        if (!first || !last) {
            event.preventDefault();
        } else if (
            event.shiftKey &&
            (active === first || active === this.element)
        ) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    }
}

@Directive({
    selector: "[kitDialogHeader]",
    host: { "data-slot": "layer-header", "[class]": "classes()" },
})
export class LayerHeader {
    readonly class = input<string>();
    protected readonly classes = computed(() =>
        cn(layer.header(), this.class()),
    );
}

@Directive({
    selector: "[kitDialogBody]",
    host: { "data-slot": "layer-body", "[class]": "classes()" },
})
export class LayerBody {
    readonly class = input<string>();
    protected readonly classes = computed(() => cn(layer.body(), this.class()));
}

@Directive({
    selector: "[kitDialogFooter]",
    host: { "data-slot": "layer-footer", "[class]": "classes()" },
})
export class LayerFooter {
    readonly class = input<string>();
    protected readonly classes = computed(() =>
        cn(layer.footer(), this.class()),
    );
}

@Directive({
    selector: "[kitDialogTitle]",
    host: {
        "data-slot": "layer-title",
        "[id]": "layer.titleId",
        "[class]": "classes()",
    },
})
export class LayerTitle {
    readonly class = input<string>();
    protected readonly layer = injectLayer("[kitDialogTitle]");
    protected readonly classes = computed(() =>
        headingClass("h2", layer.title(), this.class()),
    );
}

@Directive({
    selector: "[kitDialogDescription]",
    host: {
        "data-slot": "layer-description",
        "[id]": "layer.descriptionId",
        "[class]": "classes()",
    },
})
export class LayerDescription {
    readonly class = input<string>();
    protected readonly layer = injectLayer("[kitDialogDescription]");
    protected readonly classes = computed(() =>
        cn(text.paragraph, layer.description(), this.class()),
    );
}

/** Closes the layer on a press: on your button (`<button kitButton kitDialogClose>`). */
@Directive({
    selector: "[kitDialogClose]",
    host: { "data-slot": "layer-close", "(click)": "layer.close()" },
})
export class LayerClose {
    protected readonly layer = injectLayer("[kitDialogClose]");
}
