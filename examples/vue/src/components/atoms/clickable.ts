// Vue port of the Fragiola UI clickable atom (examples/react/src/components/atoms/clickable/index.tsx):
// the same variants, classes and palette roles (the foundation's focus ring, box and hover).
// `Clickable.Button` is a native `<button>` (`type="button"` unless given; Fragiola Primitives'
// Button renders one too); `variant`, `size`, `shape` and `disabled` are its props, everything else
// falls through. `Clickable.Link` / `Clickable.ExternalLink` are plain `<a>`s. React's `render`
// (a router link) is `as` here: a tag or a component.

import { tv, type VariantProps } from "tailwind-variants";
import { type Component, defineComponent, h, type PropType } from "vue";
import { foundation } from "#/components/families/foundation";
import { cn } from "#/lib/cn";

export const clickable = tv({
    base: [
        foundation.focus(),
        `
        inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control
        text-sm font-medium transition-colors duration-150
        [&_svg:not([class*='size-'])]:size-icon
    `,
    ],
    variants: {
        variant: {
            solid: "bg-palette-base text-palette-contrast hover:bg-palette-base-hover",
            ghost: ["bg-transparent text-palette-accent", foundation.hover()],
            outline: [foundation.box(), foundation.hover()],
            icon: ["bg-transparent text-palette-accent", foundation.hover()],
        },
        size: {
            xs: "h-4 px-2",
            sm: "h-8 px-3",
            md: "h-control px-4",
        },
        shape: {
            auto: "",
            square: "px-0 aspect-square",
        },
        disabled: {
            true: "pointer-events-none opacity-50 **:pointer-events-none",
        },
    },
    defaultVariants: {
        variant: "solid",
        size: "md",
        shape: "auto",
    },
});

type ClickableVariants = VariantProps<typeof clickable>;

const variantProps = {
    variant: {
        type: String as PropType<ClickableVariants["variant"]>,
        default: undefined,
    },
    size: {
        type: String as PropType<ClickableVariants["size"]>,
        default: undefined,
    },
    shape: {
        type: String as PropType<ClickableVariants["shape"]>,
        default: undefined,
    },
    disabled: { type: Boolean, default: false },
};

function classes(
    props: {
        variant?: ClickableVariants["variant"];
        size?: ClickableVariants["size"];
        shape?: ClickableVariants["shape"];
        disabled: boolean;
    },
    extra: unknown,
) {
    return cn(
        clickable({
            variant: props.variant,
            size: props.size,
            shape: props.shape,
            disabled: props.disabled || undefined,
        }),
        extra as string,
    );
}

const Button = defineComponent({
    name: "ClickableButton",
    inheritAttrs: false,
    props: variantProps,
    setup(props, { attrs, slots }) {
        return () =>
            h(
                "button",
                {
                    type: "button",
                    "data-slot": "clickable-button",
                    ...attrs,
                    disabled: props.disabled,
                    class: classes(props, attrs.class),
                },
                slots.default?.(),
            );
    },
});

function link(name: string, defaults: Record<string, string>) {
    return defineComponent({
        name,
        inheritAttrs: false,
        props: {
            ...variantProps,
            /** a router link component (React's `render`), else an `<a>` */
            as: {
                type: [String, Object, Function] as PropType<
                    string | Component
                >,
                default: "a",
            },
        },
        setup(props, { attrs, slots }) {
            return () => {
                const own = {
                    ...defaults,
                    ...attrs,
                    class: classes(props, attrs.class),
                };
                return typeof props.as === "string"
                    ? h(props.as, own, slots.default?.())
                    : h(props.as, own, slots);
            };
        },
    });
}

const Link = link("ClickableLink", {});
const ExternalLink = link("ClickableExternalLink", {
    target: "_blank",
    rel: "noreferrer noopener",
});

export const Clickable = { Button, Link, ExternalLink };
