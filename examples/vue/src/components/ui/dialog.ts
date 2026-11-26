// Vue port of the Fragiola UI dialog (examples/react/src/components/ui/dialog.tsx): the same parts,
// `data-slot`s, classes and palette roles (the `layer` family through createLayerParts), over Reka
// UI's Dialog.
//
// What differs from the React one, and why:
//   - `open` / `onOpenChange` are Reka UI's `v-model:open` (`:open` + `@update:open`).
//   - `Dialog.Portal` teleports (Reka UI's DialogPortal, to <body>) a `<div data-slot="dialog-portal">`
//     holding the backdrop and the content, and that element exists only while the dialog is open:
//     it is what the embed's overlay promotion watches (a direct child of <body> that comes and
//     goes, src/embed/overlay-promotion.ts). So the dialog leaves the DOM at once as it closes:
//     there is no exit animation (the opening fades and scales in, families/layer/parts.ts).
//   - `Dialog.Close` takes `as-child` for React's `render` (see families/layer/parts.ts).

import {
    DialogClose,
    DialogContent as DialogContentPrimitive,
    DialogDescription,
    DialogOverlay,
    DialogPortal as DialogPortalPrimitive,
    DialogRoot as DialogRootPrimitive,
    DialogTitle,
    DialogTrigger as DialogTriggerPrimitive,
    injectDialogRootContext,
} from "reka-ui";
import { defineComponent, h } from "vue";
import { createLayerParts } from "#/components/families/layer/parts";
import { cn } from "#/lib/cn";

const parts = createLayerParts({
    Overlay: DialogOverlay,
    Content: DialogContentPrimitive,
    Title: DialogTitle,
    Description: DialogDescription,
    Close: DialogClose,
});

// Reka UI's root renders no element (Fragiola Primitives' neither): no `data-slot="dialog"` to carry.
const DialogRoot = defineComponent({
    name: "DialogRoot",
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
        return () => h(DialogRootPrimitive, attrs, slots);
    },
});

const DialogTrigger = defineComponent({
    name: "DialogTrigger",
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
        return () =>
            h(
                DialogTriggerPrimitive,
                { "data-slot": "dialog-trigger", ...attrs },
                slots,
            );
    },
});

const DialogPortal = defineComponent({
    name: "DialogPortal",
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
        const root = injectDialogRootContext();
        return () =>
            h(DialogPortalPrimitive, null, {
                default: () =>
                    root.open.value
                        ? h(
                              "div",
                              { "data-slot": "dialog-portal", ...attrs },
                              slots.default?.(),
                          )
                        : null,
            });
    },
});

const DialogContent = defineComponent({
    name: "DialogContent",
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
        // The grid wrapper is the centring concern (fixed, inset-0, grid place-items-center), not a
        // style variant of the panel; `z-50` lifts it over the backdrop, `relative` makes the panel
        // the containing block of its close button.
        return () =>
            h(
                "div",
                {
                    class: "fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4",
                },
                [
                    h(
                        parts.Content,
                        {
                            "data-slot": "dialog-content",
                            ...attrs,
                            class: cn(
                                "relative w-full max-w-lg",
                                attrs.class as string,
                            ),
                        },
                        slots,
                    ),
                ],
            );
    },
});

export const Dialog = {
    Root: DialogRoot,
    Trigger: DialogTrigger,
    Portal: DialogPortal,
    Backdrop: parts.Backdrop,
    Content: DialogContent,
    Header: parts.Header,
    Body: parts.Body,
    Footer: parts.Footer,
    Title: parts.Title,
    Description: parts.Description,
    Close: parts.Close,
};
