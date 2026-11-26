// Angular port of the Fragiola UI field (examples/react/src/components/ui/field.tsx): the same
// parts, `data-slot`s, classes and palette roles (the `field` family). Fragiola Primitives' Field
// links the label, the control and the description by id; here `[kitField]` (and
// `[kitFieldChoice]`) provides one id, `label[kitFieldLabel]` points at it (`for`, unless given)
// and the control takes it (`input[kitInput]`, `button[kitCheckbox]`, `button[kitSelectTrigger]`,
// unless given an `id`). Native elements: no field primitive. The description and the error are
// not tied to the control through `aria-describedby` (no example shows one).
//
//     <div kitField>
//         <label kitFieldLabel>Title</label>
//         <div kitFieldRow><div kitFieldBody><input kitInput /></div></div>
//     </div>

import {
    computed,
    Directive,
    InjectionToken,
    inject,
    input,
} from "@angular/core";
import { text } from "#/components/atoms/text";
import { field } from "#/components/families/field";
import { cn } from "#/lib/cn";

/** The enclosing field: the id its control takes. */
export interface FieldContext {
    controlId: string;
}

export const FIELD = new InjectionToken<FieldContext>("kit-field");

let fields = 0;

/** The id a control inside a field takes (its own `id` wins), else none. */
export function injectFieldControlId(): string | undefined {
    return inject(FIELD, { optional: true })?.controlId;
}

function fieldContext(): FieldContext {
    fields += 1;
    return { controlId: `kit-field-${fields}` };
}

@Directive({
    selector: "[kitField]",
    providers: [{ provide: FIELD, useFactory: fieldContext }],
    host: { "data-slot": "field-root", "[class]": "classes()" },
})
export class FieldRoot {
    readonly class = input<string>();
    protected readonly classes = computed(() => cn(field.root(), this.class()));
}

@Directive({
    selector: "[kitFieldChoice]",
    providers: [{ provide: FIELD, useFactory: fieldContext }],
    host: { "data-slot": "field-choice-root", "[class]": "classes()" },
})
export class FieldChoiceRoot {
    readonly class = input<string>();
    protected readonly classes = computed(() =>
        cn(field.choiceRoot(), this.class()),
    );
}

@Directive({
    selector: "label[kitFieldLabel]",
    host: {
        "data-slot": "field-label",
        "[attr.for]": "for() ?? controlId",
        "[class]": "classes()",
    },
})
export class FieldLabel {
    readonly for = input<string>();
    readonly class = input<string>();
    protected readonly controlId = injectFieldControlId();
    protected readonly classes = computed(() =>
        cn(text.label, field.label(), this.class()),
    );
}

@Directive({
    selector: "[kitFieldRow]",
    host: { "data-slot": "field-row", "[class]": "classes()" },
})
export class FieldRow {
    readonly class = input<string>();
    protected readonly classes = computed(() => cn(field.row(), this.class()));
}

@Directive({
    selector: "[kitFieldBody]",
    host: { "data-slot": "field-body", "[class]": "classes()" },
})
export class FieldBody {
    readonly class = input<string>();
    protected readonly classes = computed(() => cn(field.body(), this.class()));
}

@Directive({
    selector: "[kitFieldInset]",
    host: { "data-slot": "field-inset", "[class]": "classes()" },
})
export class FieldInset {
    readonly class = input<string>();
    protected readonly classes = computed(() =>
        cn(field.inset(), this.class()),
    );
}

@Directive({
    selector: "[kitFieldAddon]",
    host: {
        "data-slot": "field-addon",
        "[attr.data-side]": "side()",
        "[class]": "classes()",
    },
})
export class FieldAddon {
    readonly side = input<
        "inline-start" | "inline-end" | "block-start" | "block-end"
    >("inline-end");
    readonly class = input<string>();
    protected readonly classes = computed(() =>
        cn(field.addon(), this.class()),
    );
}

@Directive({
    selector: "[kitFieldDescription]",
    host: { "data-slot": "field-description", "[class]": "classes()" },
})
export class FieldDescription {
    readonly class = input<string>();
    protected readonly classes = computed(() =>
        cn(text.paragraph, field.description(), this.class()),
    );
}

@Directive({
    selector: "[kitFieldError]",
    host: { "data-slot": "field-error", "[class]": "classes()" },
})
export class FieldError {
    readonly class = input<string>();
    protected readonly classes = computed(() =>
        cn(text.error, field.error(), this.class()),
    );
}

/** Every part of a field, for a component's `imports`. */
export const FIELD_PARTS = [
    FieldRoot,
    FieldChoiceRoot,
    FieldLabel,
    FieldRow,
    FieldBody,
    FieldInset,
    FieldAddon,
    FieldDescription,
    FieldError,
] as const;
