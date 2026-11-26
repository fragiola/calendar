// Vue port of the Fragiola UI checkbox (examples/react/src/components/ui/checkbox.tsx): the same
// parts, `data-slot`s, classes and palette roles (the `choice` family), over Reka UI's Checkbox.
//
// What differs from the React one, and why:
//   - Fragiola Primitives marks the state with `data-checked`/`data-unchecked`/
//     `data-indeterminate`; Reka UI with `data-state`. The root adds those attributes, so the
//     `choice` classes (and the indicator's `in-data-indeterminate:`) are the React ones.
//   - `checked` and `indeterminate` are props, as React's; a change is `@checked-change="(checked)
//     => …"` (React's `onCheckedChange`, without its details: Reka UI tells the new state only, and
//     a listener of the box's own in the capture phase would make Vue drop Reka UI's click under a
//     frozen clock, its handlers' attach-time check), and `v-model:checked` binds it.
//   - Inside a `Field.Root` / `Field.ChoiceRoot` the box takes the field's id (unless given one),
//     so `Field.Label` names it.

import { CheckIcon, MinusIcon } from "@lucide/vue";
import {
    CheckboxIndicator as CheckboxIndicatorPrimitive,
    CheckboxRoot as CheckboxRootPrimitive,
} from "reka-ui";
import { defineComponent, h, mergeProps } from "vue";
import { choice } from "#/components/families/choice";
import { useFieldControlId } from "#/components/ui/field";
import { cn } from "#/lib/cn";

const CheckboxRoot = defineComponent({
    name: "CheckboxRoot",
    inheritAttrs: false,
    props: {
        checked: { type: Boolean, default: false },
        indeterminate: { type: Boolean, default: false },
        disabled: { type: Boolean, default: false },
    },
    emits: {
        checkedChange: (_checked: boolean) => true,
        "update:checked": (_checked: boolean) => true,
    },
    setup(props, { attrs, slots, emit }) {
        const id = useFieldControlId();
        return () => {
            const state = props.indeterminate ? "indeterminate" : props.checked;
            const { class: className, ...rest } = attrs;
            return h(
                CheckboxRootPrimitive,
                // the consumer's listeners merged with the box's own, never replaced
                mergeProps({ id }, rest, {
                    "data-slot": "checkbox",
                    modelValue: state,
                    disabled: props.disabled,
                    "data-checked": state === true ? "" : undefined,
                    "data-unchecked": state === false ? "" : undefined,
                    "data-indeterminate":
                        state === "indeterminate" ? "" : undefined,
                    "data-disabled": props.disabled ? "" : undefined,
                    "onUpdate:modelValue": (value: unknown) => {
                        emit("update:checked", value === true);
                        emit("checkedChange", value === true);
                    },
                    class: cn(choice.mark(), className as string),
                }),
                slots,
            );
        };
    },
});

const CheckboxIndicator = defineComponent({
    name: "CheckboxIndicator",
    inheritAttrs: false,
    setup(_, { attrs }) {
        return () =>
            h(
                CheckboxIndicatorPrimitive,
                {
                    "data-slot": "checkbox-indicator",
                    ...attrs,
                    class: cn(choice.indicator(), attrs.class as string),
                },
                {
                    default: () => [
                        h(CheckIcon, {
                            class: "size-icon-xs in-data-indeterminate:hidden",
                            "stroke-width": 3,
                        }),
                        h(MinusIcon, {
                            class: "hidden size-icon-xs in-data-indeterminate:block",
                            "stroke-width": 3,
                        }),
                    ],
                },
            );
    },
});

export const Checkbox = {
    Root: CheckboxRoot,
    Indicator: CheckboxIndicator,
};
