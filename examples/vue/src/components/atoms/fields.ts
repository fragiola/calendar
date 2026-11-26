// Vue port of the Fragiola UI input atom and its simple template
// (examples/react/src/components/atoms/fields): the same classes and palette roles (the `field`
// family) on a native `<input>`. `Input` is the bare control: inside a `Field.Root` it takes the
// field's id (the label's `for`), and `v-model` binds its text (`modelValue` +
// `update:modelValue`; `:value` and `@input` fall through as on any input). `Input.Template.Simple`
// is a whole field: label, row, input, description and error. Only the input: the examples use no
// `Textarea` nor `Numeric`.

import { defineComponent, h, mergeProps, type PropType } from "vue";
import { field } from "#/components/families/field";
import { Field, useFieldControlId } from "#/components/ui/field";
import { cn } from "#/lib/cn";

const InputControl = defineComponent({
    name: "FieldInput",
    inheritAttrs: false,
    props: {
        modelValue: {
            type: [String, Number] as PropType<string | number>,
            default: undefined,
        },
    },
    emits: { "update:modelValue": (_value: string) => true },
    setup(props, { attrs, emit }) {
        const id = useFieldControlId();
        return () =>
            h(
                "input",
                mergeProps(
                    { "data-slot": "input", id },
                    props.modelValue === undefined
                        ? {}
                        : {
                              value: props.modelValue,
                              onInput: (event: Event) =>
                                  emit(
                                      "update:modelValue",
                                      (event.target as HTMLInputElement).value,
                                  ),
                          },
                    attrs,
                    { class: cn(field.control(), attrs.class as string) },
                ),
            );
    },
});

const Simple = defineComponent({
    name: "FieldInputTemplateSimple",
    inheritAttrs: false,
    props: {
        label: { type: String, default: undefined },
        description: { type: String, default: undefined },
        error: { type: String, default: undefined },
        required: { type: Boolean, default: false },
    },
    setup(props, { attrs, slots }) {
        return () => {
            const { class: className, ...inputAttrs } = attrs;
            return h(Field.Root, null, {
                default: () => [
                    props.label
                        ? h(Field.Label, null, {
                              default: () => [
                                  props.label,
                                  props.required
                                      ? h(
                                            "span",
                                            { "aria-hidden": "true" },
                                            "*",
                                        )
                                      : null,
                              ],
                          })
                        : null,
                    h(Field.Row, null, {
                        default: () => [
                            slots.addonStart
                                ? h(
                                      Field.Addon,
                                      { side: "inline-start" },
                                      slots.addonStart,
                                  )
                                : null,
                            h(
                                Field.Body,
                                { class: className },
                                {
                                    default: () => [
                                        slots.insetStart
                                            ? h(
                                                  "span",
                                                  { class: field.inset() },
                                                  slots.insetStart(),
                                              )
                                            : null,
                                        h(InputControl, {
                                            ...inputAttrs,
                                            required: props.required,
                                        }),
                                        slots.insetEnd
                                            ? h(
                                                  "span",
                                                  { class: field.inset() },
                                                  slots.insetEnd(),
                                              )
                                            : null,
                                    ],
                                },
                            ),
                            slots.addonEnd
                                ? h(
                                      Field.Addon,
                                      { side: "inline-end" },
                                      slots.addonEnd,
                                  )
                                : null,
                        ],
                    }),
                    props.description
                        ? h(Field.Description, null, {
                              default: () => props.description,
                          })
                        : null,
                    props.error
                        ? h(Field.Error, null, { default: () => props.error })
                        : null,
                ],
            });
        };
    },
});

/** The bare control, with the template attached: `<Input />`, `<Input.Template.Simple label="…" />`. */
export const Input = Object.assign(InputControl, { Template: { Simple } });
