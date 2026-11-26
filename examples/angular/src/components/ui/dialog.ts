// Angular port of the Fragiola UI dialog (examples/react/src/components/ui/dialog.tsx): the same
// parts, `data-slot`s, classes and palette roles (the `layer` family, families/layer/parts.ts).
//
// What differs from the React one, and why:
//   - The root is a directive on the `ng-template` holding the dialog's parts, React's
//     `Dialog.Root` + `Dialog.Portal`: while `open`, it renders them into a
//     `<div data-slot="dialog-portal">` it appends to <body>, and removes it as the dialog closes.
//     That element is what the embed's overlay promotion watches (a direct child of <body> that
//     comes and goes, src/embed/overlay-promotion.ts). So the dialog leaves the DOM at once as it
//     closes: there is no exit animation (the opening fades and scales in).
//   - `open` / `onOpenChange` are `[(open)]` (`[open]` + `(openChange)`: Escape, a press outside
//     the panel, a close button). A `button[kitDialogTrigger]` given the dialog opens it.
//   - The content's `[autofocus]` element takes the focus as it opens (React's `autoFocus`).
//
//     <ng-template kitDialog [open]="editing() !== null" (openChange)="$event || cancel()">
//         <div kitDialogBackdrop></div>
//         <kit-dialog-content>
//             <div kitDialogHeader><h2 kitDialogTitle>New event</h2></div>
//             <div kitDialogFooter><button kitButton kitDialogClose>Cancel</button></div>
//         </kit-dialog-content>
//     </ng-template>

import {
    Component,
    computed,
    DestroyRef,
    Directive,
    type EmbeddedViewRef,
    effect,
    inject,
    input,
    model,
    TemplateRef,
    untracked,
    ViewContainerRef,
} from "@angular/core";
import {
    LAYER,
    LayerBackdrop,
    LayerBody,
    LayerClose,
    LayerContent,
    LayerDescription,
    LayerFooter,
    LayerHeader,
    LayerTitle,
} from "#/components/families/layer/parts";
import { cn } from "#/lib/cn";

let dialogs = 0;

/** The dialog: its parts are the template's, rendered in a portal on <body> while it is open. */
@Directive({
    selector: "ng-template[kitDialog]",
    exportAs: "kitDialog",
    providers: [{ provide: LAYER, useFactory: () => inject(Dialog) }],
})
export class Dialog {
    readonly open = model(false);
    readonly titleId: string;
    readonly descriptionId: string;

    constructor() {
        dialogs += 1;
        this.titleId = `kit-dialog-${dialogs}-title`;
        this.descriptionId = `kit-dialog-${dialogs}-description`;
        const container = inject(ViewContainerRef);
        const template = inject(TemplateRef);
        let view: EmbeddedViewRef<unknown> | undefined;
        let portal: HTMLElement | undefined;
        const unmount = () => {
            view?.destroy();
            portal?.remove();
            view = undefined;
            portal = undefined;
        };
        effect(() => {
            const open = this.open();
            untracked(() => {
                if (!open) return unmount();
                if (view) return;
                view = container.createEmbeddedView(template);
                const document = (container.element.nativeElement as Node)
                    .ownerDocument as Document;
                portal = document.createElement("div");
                portal.setAttribute("data-slot", "dialog-portal");
                portal.append(...(view.rootNodes as Node[]));
                document.body.append(portal);
            });
        });
        inject(DestroyRef).onDestroy(unmount);
    }

    close() {
        this.open.set(false);
    }
}

/** Opens the dialog it is given: `<button kitButton [kitDialogTrigger]="editor">`. */
@Directive({
    selector: "button[kitDialogTrigger]",
    host: {
        "data-slot": "dialog-trigger",
        "aria-haspopup": "dialog",
        "[attr.aria-expanded]": "kitDialogTrigger().open()",
        "(click)": "kitDialogTrigger().open.set(true)",
    },
})
export class DialogTrigger {
    readonly kitDialogTrigger = input.required<Dialog>();
}

/**
 * The panel, centred over the page: a press outside it (on the backdrop) closes the dialog. The
 * grid wrapper is the centring concern (fixed, inset-0, grid place-items-center), not a style
 * variant of the panel; `z-50` lifts it over the backdrop, `relative` makes the panel the
 * containing block of its close button.
 */
@Component({
    selector: "kit-dialog-content",
    imports: [LayerContent],
    host: { class: "contents" },
    template: `
        <div
            class="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4"
            (pointerdown)="outside($event)"
        >
            <div kitLayerContent slot="dialog-content" [showClose]="showClose()" [class]="classes()">
                <ng-content />
            </div>
        </div>
    `,
})
export class DialogContent {
    readonly showClose = input(true);
    readonly class = input<string>();
    private readonly dialog = inject(Dialog);
    protected readonly classes = computed(() =>
        cn("relative w-full max-w-lg", this.class()),
    );

    protected outside(event: PointerEvent) {
        if (event.target === event.currentTarget) this.dialog.close();
    }
}

/** Every part of a dialog, for a component's `imports`. */
export const DIALOG = [
    Dialog,
    DialogTrigger,
    DialogContent,
    LayerBackdrop,
    LayerHeader,
    LayerBody,
    LayerFooter,
    LayerTitle,
    LayerDescription,
    LayerClose,
] as const;
