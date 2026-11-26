// Vue port of the Fragiola UI segmented control (examples/react/src/components/ui/segmented-control.tsx):
// the same parts, `data-slot`s, classes and palette roles (the foundation's box, current, hover,
// focus and disabled members), over Reka UI's RadioGroup: a `radiogroup` of `radio` buttons, one
// tab stop, the arrows moving the focus and the check together (the APG radio group, as Fragiola
// Primitives' SegmentedControl).
//
// What differs from the React one, and why:
//   - `value` / `onValueChange` are Reka UI's `v-model` (`:model-value` + `@update:model-value`).
//   - Fragiola Primitives measures the checked item into the indicator's
//     `--segment-indicator-*` variables; Reka UI has no indicator, so the root measures it the same
//     way (the item's box from the root's padding box, `inline-start` from the right edge in RTL),
//     again on a resize of either and on a change of the checked item.
//   - The checked item carries `data-active` (Reka UI's roving focus marks it, as React's
//     `render` adds it), so `current:` lights it; `data-checked`/`data-unchecked` are added.

import {
    injectRadioGroupRootContext,
    RadioGroupItem,
    RadioGroupRoot,
} from "reka-ui";
import {
    type ComponentPublicInstance,
    defineComponent,
    h,
    onBeforeUnmount,
    onMounted,
    ref,
    shallowRef,
} from "vue";
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

const SegmentedControlRoot = defineComponent({
    name: "SegmentedControlRoot",
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
        const root = ref<ComponentPublicInstance | null>(null);
        const box = shallowRef<Record<string, string> | null>(null);
        let resize: ResizeObserver | undefined;
        let mutation: MutationObserver | undefined;
        let observed: HTMLElement | null = null;

        const element = () => (root.value?.$el as HTMLElement | null) ?? null;
        const measure = () => {
            const el = element();
            const checked = el?.querySelector<HTMLElement>(
                '[role="radio"][aria-checked="true"]',
            );
            box.value = el && checked ? indicatorBox(el, checked) : null;
            if (checked !== observed) {
                if (observed) resize?.unobserve(observed);
                if (checked) resize?.observe(checked);
                observed = checked ?? null;
            }
        };

        onMounted(() => {
            const el = element();
            if (!el) return;
            resize = new ResizeObserver(measure);
            resize.observe(el);
            mutation = new MutationObserver(measure);
            mutation.observe(el, {
                subtree: true,
                attributes: true,
                attributeFilter: ["aria-checked"],
            });
            measure();
        });
        onBeforeUnmount(() => {
            resize?.disconnect();
            mutation?.disconnect();
        });

        return () =>
            h(
                RadioGroupRoot,
                {
                    ref: root,
                    "data-slot": "segmented-control",
                    ...attrs,
                    class: cn(
                        foundation.box(),
                        foundation.disabled(),
                        `
                        relative isolate inline-flex min-h-control w-fit
                        items-stretch gap-0.5 rounded-control p-0.5
                        data-[orientation=vertical]:flex-col
                        `,
                        attrs.class as string,
                    ),
                },
                {
                    default: () => [
                        slots.default?.(),
                        box.value
                            ? h("span", {
                                  "aria-hidden": "true",
                                  "data-slot": "segmented-control-indicator",
                                  "data-active": "",
                                  style: box.value,
                                  class: cn(
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
                                  ),
                              })
                            : null,
                    ],
                },
            );
    },
});

const SegmentedControlItem = defineComponent({
    name: "SegmentedControlItem",
    inheritAttrs: false,
    props: {
        value: { type: [String, Number], required: true },
        disabled: { type: Boolean, default: false },
    },
    setup(props, { attrs, slots }) {
        const group = injectRadioGroupRootContext();
        return () => {
            const checked = group.modelValue?.value === props.value;
            return h(
                RadioGroupItem,
                {
                    "data-slot": "segmented-control-item",
                    value: props.value,
                    disabled: props.disabled,
                    "data-checked": checked ? "" : undefined,
                    "data-unchecked": checked ? undefined : "",
                    ...attrs,
                    class: cn(
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
                        attrs.class as string,
                    ),
                },
                slots,
            );
        };
    },
});

const SegmentedControlItemText = defineComponent({
    name: "SegmentedControlItemText",
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
        return () =>
            h(
                "span",
                {
                    "data-slot": "segmented-control-item-text",
                    ...attrs,
                    class: cn("truncate", attrs.class as string),
                },
                slots.default?.(),
            );
    },
});

export const SegmentedControl = {
    Root: SegmentedControlRoot,
    Item: SegmentedControlItem,
    ItemText: SegmentedControlItemText,
};
