// Angular port of the Fragiola UI text atoms (examples/react/src/components/atoms/text/index.tsx):
// the same classes and palette roles, as class strings the kit's parts wear (a dialog's title is a
// heading, a field's label a label). Only the atoms the kit uses.

import { tv } from "tailwind-variants";
import { cn } from "#/lib/cn";

/** A heading's classes, by its level. */
export const heading = tv({
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

/** Each text atom's classes. */
export const text = {
    paragraph: "text-palette-contrast text-sm transition-all",
    label: "text-palette-contrast text-sm font-medium block",
    error: "palette-danger text-xs text-palette-accent",
};

/** A heading's classes with yours. */
export function headingClass(
    hierarchy: "h1" | "h2" | "h3",
    ...classes: (string | undefined)[]
) {
    return heading({ hierarchy, className: cn(...classes) });
}
