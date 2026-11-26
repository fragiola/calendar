// Vue port of the Fragiola UI popover (examples/react/src/components/ui/popover.tsx): the same
// parts, `data-slot`s, classes and palette roles (the `popup` family), over Reka UI's Popover.
//
// What differs from the React one, and why:
//   - `open` / `onOpenChange` are Reka UI's `v-model:open` (`:open` + `@update:open`, the new
//     state only: no change details).
//   - React's `render` on the trigger is `as-child`: `<Popover.Trigger as-child><Calendar.More
//     … /></Popover.Trigger>`.
//   - Fragiola Primitives marks the popup with `data-open`/`data-closed` and gives it Base UI's
//     `--available-height`/`--transform-origin`; Reka UI marks `data-state` and names its own
//     variables. The content adds Base UI's attributes and maps the variables, so the `popup`
//     family's classes apply unchanged.
//   - Reka UI's Popover has no title nor description: `Popover.Title` and `Popover.Description`
//     are the text atoms (an `h2`, a `p`) with an id of their own, and once mounted they label and
//     describe the popup (`aria-labelledby` / `aria-describedby` on it, as Fragiola Primitives'):
//     Reka UI labels it by its trigger, and sets that attribute only while its value changes.

import { XIcon } from "@lucide/vue";
import {
    injectPopoverRootContext,
    PopoverClose as PopoverClosePrimitive,
    PopoverContent as PopoverContentPrimitive,
    PopoverPortal,
    PopoverRoot as PopoverRootPrimitive,
    PopoverTrigger as PopoverTriggerPrimitive,
} from "reka-ui";
import {
    type Component,
    type ComponentPublicInstance,
    defineComponent,
    h,
    onBeforeUnmount,
    onMounted,
    onUpdated,
    type PropType,
    ref,
    type StyleValue,
    useId,
} from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { Text } from "#/components/atoms/text";
import { popup } from "#/components/families/popup";
import { cn } from "#/lib/cn";

const PopoverRoot = defineComponent({
    name: "PopoverRoot",
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
        return () => h(PopoverRootPrimitive, attrs, slots);
    },
});

const PopoverTrigger = defineComponent({
    name: "PopoverTrigger",
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
        return () =>
            h(
                PopoverTriggerPrimitive,
                { "data-slot": "popover-trigger", ...attrs },
                slots,
            );
    },
});

const PopoverContent = defineComponent({
    name: "PopoverContent",
    inheritAttrs: false,
    props: {
        /** Whether to render the close affordance. */
        showClose: { type: Boolean, default: true },
        align: {
            type: String as PropType<"start" | "center" | "end">,
            default: "center",
        },
        alignOffset: { type: Number, default: 0 },
        side: {
            type: String as PropType<"top" | "right" | "bottom" | "left">,
            default: "bottom",
        },
        sideOffset: { type: Number, default: 0 },
    },
    setup(props, { attrs, slots }) {
        const root = injectPopoverRootContext();
        return () =>
            h(PopoverPortal, null, {
                default: () =>
                    h(
                        PopoverContentPrimitive,
                        {
                            "data-slot": "popover-content",
                            align: props.align,
                            alignOffset: props.alignOffset,
                            side: props.side,
                            sideOffset: props.sideOffset,
                            // Base UI's collision padding, as POSITIONER_DEFAULTS
                            collisionPadding: 5,
                            "data-open": root.open.value ? "" : undefined,
                            "data-closed": root.open.value ? undefined : "",
                            ...attrs,
                            style: [
                                attrs.style as StyleValue,
                                {
                                    "--available-height":
                                        "var(--reka-popover-content-available-height)",
                                    "--transform-origin":
                                        "var(--reka-popover-content-transform-origin)",
                                },
                            ],
                            class: cn(
                                popup.content("z-50 outline-none"),
                                attrs.class as string,
                            ),
                        },
                        {
                            default: () => [
                                props.showClose
                                    ? h(
                                          PopoverClosePrimitive,
                                          { asChild: true },
                                          {
                                              default: () =>
                                                  h(
                                                      Clickable.Button,
                                                      {
                                                          variant: "icon",
                                                          shape: "square",
                                                          size: "sm",
                                                          "aria-label": "Close",
                                                          class: "absolute top-4 end-4",
                                                      },
                                                      {
                                                          default: () =>
                                                              h(XIcon),
                                                      },
                                                  ),
                                          },
                                      )
                                    : null,
                                slots.default?.(),
                            ],
                        },
                    ),
            });
    },
});

/**
 * A text part that names its popup: its id on the content's `attribute` after each render (the
 * popup is its ancestor, under the portal), removed when it unmounts.
 */
function popupText(
    name: string,
    slot: string,
    atom: Component,
    atomProps: Record<string, unknown>,
    classes: string,
    attribute: "aria-labelledby" | "aria-describedby",
) {
    return defineComponent({
        name,
        inheritAttrs: false,
        setup(_, { attrs, slots }) {
            const own = useId();
            const element = ref<ComponentPublicInstance | null>(null);
            let popup: Element | null = null;
            const id = () => (attrs.id as string | undefined) ?? own;
            const name = () => {
                const el = element.value?.$el as Element | undefined;
                popup = el?.closest('[data-slot="popover-content"]') ?? null;
                popup?.setAttribute(attribute, id());
            };
            onMounted(name);
            onUpdated(name);
            onBeforeUnmount(() => {
                if (popup?.getAttribute(attribute) === id()) {
                    popup.removeAttribute(attribute);
                }
            });
            return () =>
                h(
                    atom,
                    {
                        ref: element,
                        "data-slot": slot,
                        ...atomProps,
                        ...attrs,
                        id: id(),
                        class: cn(classes, attrs.class as string),
                    },
                    slots,
                );
        },
    });
}

const PopoverTitle = popupText(
    "PopoverTitle",
    "popover-title",
    Text.Heading,
    { as: "h2" },
    "text-palette-contrast",
    "aria-labelledby",
);

const PopoverDescription = popupText(
    "PopoverDescription",
    "popover-description",
    Text.Paragraph,
    {},
    "text-palette-accent/85",
    "aria-describedby",
);

const PopoverClose = defineComponent({
    name: "PopoverClose",
    inheritAttrs: false,
    props: {
        /** Render the slot's element as the close button (React's `render`). */
        asChild: { type: Boolean, default: false },
    },
    setup(props, { attrs, slots }) {
        return () =>
            props.asChild
                ? h(
                      PopoverClosePrimitive,
                      { asChild: true, "data-slot": "popover-close", ...attrs },
                      slots,
                  )
                : h(
                      PopoverClosePrimitive,
                      { asChild: true },
                      {
                          default: () =>
                              h(
                                  Clickable.Button,
                                  {
                                      "data-slot": "popover-close",
                                      variant: "ghost",
                                      size: "sm",
                                      ...attrs,
                                  },
                                  slots,
                              ),
                      },
                  );
    },
});

export const Popover = {
    Root: PopoverRoot,
    Trigger: PopoverTrigger,
    Content: PopoverContent,
    Title: PopoverTitle,
    Description: PopoverDescription,
    Close: PopoverClose,
};
