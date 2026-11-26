// Angular port of the Fragiola UI clickable atom (examples/react/src/components/atoms/clickable/index.tsx):
// the same variants, classes and palette roles (the foundation's focus ring, box and hover).
// `button[kitButton]` is a native `<button>` (`type="button"` unless given, as Fragiola
// Primitives' Button); `variant`, `size`, `shape` and `disabled` are its inputs, `class` is merged
// over the atom's classes. Only the button: the examples use no link.
//
//     <button kitButton variant="outline">Cancel</button>

import { booleanAttribute, computed, Directive, input } from "@angular/core";
import { tv, type VariantProps } from "tailwind-variants";
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

/** The clickable atom on a native button. */
@Directive({
    selector: "button[kitButton]",
    host: {
        "data-slot": "clickable-button",
        "[type]": "type()",
        "[disabled]": "disabled()",
        "[class]": "classes()",
    },
})
export class Button {
    readonly type = input<"button" | "submit" | "reset">("button");
    readonly variant = input<ClickableVariants["variant"]>();
    readonly size = input<ClickableVariants["size"]>();
    readonly shape = input<ClickableVariants["shape"]>();
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly class = input<string>();
    protected readonly classes = computed(() =>
        cn(
            clickable({
                variant: this.variant(),
                size: this.size(),
                shape: this.shape(),
                disabled: this.disabled() || undefined,
            }),
            this.class(),
        ),
    );
}
