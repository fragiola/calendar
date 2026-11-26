// Vue port of the Fragiola UI text atoms (examples/react/src/components/atoms/text/index.tsx): the
// same elements, classes and palette roles. Each takes `class` and falls everything else through.

import { tv } from "tailwind-variants";
import { defineComponent, h, type PropType } from "vue";
import { foundation } from "#/components/families/foundation";
import { cn } from "#/lib/cn";

const headingVariants = tv({
    base: "font-semibold text-palette-contrast",
    variants: {
        hierarchy: {
            h1: "text-2xl",
            h2: "text-xl",
            h3: "text-lg",
        },
    },
});

/** The classes secondary text wears. */
export const SECONDARY_TEXT = "text-palette-accent/85";

const Heading = defineComponent({
    name: "TextHeading",
    inheritAttrs: false,
    props: {
        as: { type: String as PropType<"h1" | "h2" | "h3">, default: "h1" },
    },
    setup(props, { attrs, slots }) {
        return () =>
            h(
                props.as,
                {
                    ...attrs,
                    class: headingVariants({
                        hierarchy: props.as,
                        className: attrs.class as string,
                    }),
                },
                slots.default?.(),
            );
    },
});

function element(
    name: string,
    tag: string,
    classes: string,
    extra: Record<string, string> = {},
) {
    return defineComponent({
        name,
        inheritAttrs: false,
        setup(_, { attrs, slots }) {
            return () =>
                h(
                    tag,
                    {
                        ...extra,
                        ...attrs,
                        class: cn(classes, attrs.class as string),
                    },
                    slots.default?.(),
                );
        },
    });
}

const UNDERLINED =
    "rounded-sm text-palette-contrast text-sm underline decoration-palette-line underline-offset-4 transition-colors duration-150 hover:decoration-current";

export const Text = {
    Heading,
    Paragraph: element(
        "TextParagraph",
        "p",
        "text-palette-contrast text-sm transition-all",
    ),
    Link: element("TextLink", "a", cn(foundation.focus(), UNDERLINED)),
    Small: element(
        "TextSmall",
        "small",
        "text-palette-contrast text-xs italic",
    ),
    Label: element(
        "TextLabel",
        "label",
        "text-palette-contrast text-sm font-medium block",
    ),
    Error: element(
        "TextError",
        "span",
        "palette-danger text-xs text-palette-accent",
    ),
    Strong: element(
        "TextStrong",
        "strong",
        "text-palette-contrast text-sm font-semibold",
    ),
    Highlight: element(
        "TextHighlight",
        "span",
        "text-palette-contrast text-sm",
    ),
    Clickable: element(
        "TextClickable",
        "button",
        cn(foundation.focus(), "inline", UNDERLINED),
        { type: "button" },
    ),
};
