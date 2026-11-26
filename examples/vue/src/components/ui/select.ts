// Vue port of the Fragiola UI select (examples/react/src/components/ui/select.tsx): the same
// parts, `data-slot`s, classes and palette roles, over Reka UI's Select.
//
// Select — the recombination test. This component is field + popup + menu, and it declares no new
// style. Every class comes from a family:
//   - Trigger uses field.row (the box) + layout
//   - Content uses popup.content (the floating box)
//   - Item uses menu.selectableItem (the option with indicator space)
//   - ItemIndicator uses menu.itemIndicator
//
// What differs from the React one, and why:
//   - `value` / `onValueChange` are Reka UI's `v-model` (`:model-value` + `@update:model-value`).
//   - Fragiola Primitives marks state with `data-open`/`data-closed`/`data-selected`; Reka UI
//     with `data-state`. The parts add those attributes, so the families' variants apply unchanged.
//   - `items` on the root (an array of `{ value, label }` or a record, as React's) gives
//     `Select.Value` the label of the chosen value before the list was ever opened.
//   - Inside a `Field.Root` the trigger takes the field's id, so `Field.Label` names it.
//   - The list is positioned under the trigger (`position: "popper"`) and teleports to <body>.

import { CheckIcon, ChevronDownIcon } from "@lucide/vue";
import {
    injectSelectRootContext,
    SelectContent as SelectContentPrimitive,
    SelectGroup as SelectGroupPrimitive,
    SelectItemIndicator,
    SelectItem as SelectItemPrimitive,
    SelectItemText,
    SelectLabel as SelectLabelPrimitive,
    SelectPortal,
    SelectRoot as SelectRootPrimitive,
    SelectSeparator as SelectSeparatorPrimitive,
    SelectTrigger as SelectTriggerPrimitive,
    SelectValue as SelectValuePrimitive,
    SelectViewport,
} from "reka-ui";
import {
    type ComputedRef,
    computed,
    defineComponent,
    h,
    type InjectionKey,
    inject,
    type PropType,
    provide,
    type StyleValue,
} from "vue";
import { field } from "#/components/families/field";
import { menu } from "#/components/families/menu";
import { popup } from "#/components/families/popup";
import { useFieldControlId } from "#/components/ui/field";
import { cn } from "#/lib/cn";

/** The options' labels, by value: an array of `{ value, label }` or a record, as Base UI takes. */
export type SelectItems =
    | readonly { value: unknown; label: string }[]
    | Readonly<Record<string, string>>;

const ITEMS: InjectionKey<ComputedRef<SelectItems | undefined>> =
    Symbol("select-items");

function labelOf(items: SelectItems | undefined, value: unknown) {
    if (!items) return undefined;
    if (Array.isArray(items)) {
        return (items as { value: unknown; label: string }[]).find(
            (item) => item.value === value,
        )?.label;
    }
    return typeof value === "string"
        ? (items as Record<string, string>)[value]
        : undefined;
}

const SelectRoot = defineComponent({
    name: "SelectRoot",
    inheritAttrs: false,
    props: {
        items: {
            type: [Array, Object] as PropType<SelectItems>,
            default: undefined,
        },
    },
    setup(props, { attrs, slots }) {
        provide(
            ITEMS,
            computed(() => props.items),
        );
        return () => h(SelectRootPrimitive, attrs, slots);
    },
});

const SelectValue = defineComponent({
    name: "SelectValue",
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
        const items = inject(ITEMS, undefined);
        const root = injectSelectRootContext();
        return () => {
            const label = labelOf(items?.value, root.modelValue.value);
            return h(
                SelectValuePrimitive,
                {
                    "data-slot": "select-value",
                    ...attrs,
                    class: cn(
                        "text-sm text-palette-accent/85",
                        attrs.class as string,
                    ),
                },
                label === undefined ? slots : { default: () => label },
            );
        };
    },
});

const SelectTrigger = defineComponent({
    name: "SelectTrigger",
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
        const id = useFieldControlId();
        return () =>
            h(
                SelectTriggerPrimitive,
                {
                    "data-slot": "select-trigger",
                    id,
                    ...attrs,
                    // The trigger IS a field row. The box (border, background, focus ring) comes
                    // from field.row; the layout (flex-row, padding) is the trigger's own.
                    class: cn(
                        field.row(),
                        "flex-row items-center justify-between px-3 py-2",
                        attrs.class as string,
                    ),
                },
                {
                    default: () => [
                        slots.default?.(),
                        h(ChevronDownIcon, {
                            class: "size-icon text-palette-accent/85",
                        }),
                    ],
                },
            );
    },
});

const SelectContent = defineComponent({
    name: "SelectContent",
    inheritAttrs: false,
    props: {
        align: {
            type: String as PropType<"start" | "center" | "end">,
            default: "start",
        },
        alignOffset: { type: Number, default: 0 },
        side: {
            type: String as PropType<"top" | "right" | "bottom" | "left">,
            default: "bottom",
        },
        sideOffset: { type: Number, default: 4 },
    },
    setup(props, { attrs, slots }) {
        const root = injectSelectRootContext();
        return () =>
            h(SelectPortal, null, {
                default: () =>
                    h(
                        SelectContentPrimitive,
                        {
                            "data-slot": "select-content",
                            position: "popper",
                            align: props.align,
                            alignOffset: props.alignOffset,
                            side: props.side,
                            sideOffset: props.sideOffset,
                            // Base UI's collision padding, as POSITIONER_DEFAULTS
                            collisionPadding: 5,
                            "data-open": root.open.value ? "" : undefined,
                            "data-closed": root.open.value ? undefined : "",
                            ...attrs,
                            // Base UI's variables over Reka UI's, after the consumer's style
                            style: [
                                attrs.style as StyleValue,
                                {
                                    "--available-height":
                                        "var(--reka-select-content-available-height)",
                                    "--transform-origin":
                                        "var(--reka-select-content-transform-origin)",
                                },
                            ],
                            class: cn(
                                popup.content("z-50 outline-none"),
                                attrs.class as string,
                            ),
                        },
                        { default: () => h(SelectViewport, null, slots) },
                    ),
            });
    },
});

const SelectItem = defineComponent({
    name: "SelectItem",
    inheritAttrs: false,
    props: {
        value: {
            type: null as unknown as PropType<string | number>,
            required: true,
        },
    },
    setup(props, { attrs, slots }) {
        const root = injectSelectRootContext();
        return () =>
            h(
                SelectItemPrimitive,
                {
                    "data-slot": "select-item",
                    value: props.value,
                    "data-selected":
                        root.modelValue.value === props.value ? "" : undefined,
                    ...attrs,
                    class: cn(menu.selectableItem(), attrs.class as string),
                },
                {
                    default: () => [
                        h(
                            SelectItemIndicator,
                            {
                                class: menu.itemIndicator(),
                                "data-slot": "select-item-indicator",
                            },
                            { default: () => h(CheckIcon) },
                        ),
                        h(SelectItemText, null, slots),
                    ],
                },
            );
    },
});

const SelectGroup = defineComponent({
    name: "SelectGroup",
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
        return () =>
            h(
                SelectGroupPrimitive,
                { "data-slot": "select-group", ...attrs },
                slots,
            );
    },
});

const SelectLabel = defineComponent({
    name: "SelectLabel",
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
        return () =>
            h(
                SelectLabelPrimitive,
                {
                    "data-slot": "select-label",
                    ...attrs,
                    class: cn(menu.label(), attrs.class as string),
                },
                slots,
            );
    },
});

const SelectSeparator = defineComponent({
    name: "SelectSeparator",
    inheritAttrs: false,
    setup(_, { attrs }) {
        return () =>
            h(SelectSeparatorPrimitive, {
                "data-slot": "select-separator",
                ...attrs,
                class: cn(menu.separator(), attrs.class as string),
            });
    },
});

export const Select = {
    Root: SelectRoot,
    Trigger: SelectTrigger,
    Value: SelectValue,
    Content: SelectContent,
    Item: SelectItem,
    Group: SelectGroup,
    Label: SelectLabel,
    Separator: SelectSeparator,
};
