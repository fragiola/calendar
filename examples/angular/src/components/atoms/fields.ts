// Angular port of the Fragiola UI input atom (examples/react/src/components/atoms/fields/input.tsx):
// the same classes and palette roles (the `field` family) on a native `<input>`. Inside a
// `[kitField]` it takes the field's id (the label's `for`) unless given one; `[(value)]` binds its
// text. Only the input: the examples use no textarea nor numeric field.
//
//     <input kitInput [(value)]="title" placeholder="New event" />

import { computed, Directive, input, model } from "@angular/core";
import { field } from "#/components/families/field";
import { injectFieldControlId } from "#/components/ui/field";
import { cn } from "#/lib/cn";

@Directive({
    selector: "input[kitInput]",
    exportAs: "kitInput",
    host: {
        "data-slot": "input",
        "[attr.id]": "id() ?? controlId",
        "[value]": "value()",
        "(input)": "value.set($any($event.target).value)",
        "[class]": "classes()",
    },
})
export class Input {
    readonly value = model("");
    readonly id = input<string>();
    readonly class = input<string>();
    protected readonly controlId = injectFieldControlId();
    protected readonly classes = computed(() =>
        cn(field.control(), this.class()),
    );
}
