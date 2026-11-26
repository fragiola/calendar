// Angular port of the Fragiola UI checkbox (examples/react/src/components/ui/checkbox.tsx): the same
// parts, `data-slot`s, classes and palette roles (the `choice` family), on a native
// `<button role="checkbox">` (Space and Enter toggle it, as a button's click), with Base UI's
// state attributes (`data-checked` / `data-unchecked` / `data-indeterminate`), so the `choice`
// classes (and the indicator's `in-data-indeterminate:`) are the React ones.
//
// What differs from the React one, and why:
//   - `checked` / `onCheckedChange` are `[(checked)]` (`[checked]` + `(checkedChange)`, the new
//     state only); unbound, the box keeps its own state.
//   - The indicator is rendered while the box is checked or indeterminate, as Base UI's.
//   - Inside a `[kitField]` / `[kitFieldChoice]` the box takes the field's id (unless given one),
//     so `label[kitFieldLabel]` names it.
//
//     <button kitCheckbox [(checked)]="visible"><span kitCheckboxIndicator></span></button>

import {
    booleanAttribute,
    Component,
    computed,
    Directive,
    inject,
    input,
    model,
} from "@angular/core";
import { LucideCheck, LucideMinus } from "@lucide/angular";
import { choice } from "#/components/families/choice";
import { injectFieldControlId } from "#/components/ui/field";
import { cn } from "#/lib/cn";

@Directive({
    selector: "button[kitCheckbox]",
    exportAs: "kitCheckbox",
    host: {
        type: "button",
        role: "checkbox",
        "data-slot": "checkbox",
        "[attr.id]": "id() ?? controlId",
        "[attr.aria-checked]": "indeterminate() ? 'mixed' : checked()",
        "[attr.data-checked]": "!indeterminate() && checked() ? '' : null",
        "[attr.data-unchecked]": "!indeterminate() && !checked() ? '' : null",
        "[attr.data-indeterminate]": "indeterminate() ? '' : null",
        "[attr.data-disabled]": "disabled() ? '' : null",
        "[disabled]": "disabled()",
        "[class]": "classes()",
        "(click)": "toggle()",
    },
})
export class Checkbox {
    readonly checked = model(false);
    readonly indeterminate = input(false, { transform: booleanAttribute });
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly id = input<string>();
    readonly class = input<string>();
    protected readonly controlId = injectFieldControlId();
    protected readonly classes = computed(() =>
        cn(choice.mark(), this.class()),
    );

    protected toggle() {
        if (!this.disabled()) this.checked.set(!this.checked());
    }
}

@Component({
    selector: "[kitCheckboxIndicator]",
    imports: [LucideCheck, LucideMinus],
    host: {
        "data-slot": "checkbox-indicator",
        "[hidden]": "!box.checked() && !box.indeterminate()",
        "[class]": "classes()",
    },
    template: `
        <svg lucideCheck class="size-icon-xs in-data-indeterminate:hidden" [strokeWidth]="3"></svg>
        <svg lucideMinus class="hidden size-icon-xs in-data-indeterminate:block" [strokeWidth]="3"></svg>
    `,
})
export class CheckboxIndicator {
    readonly class = input<string>();
    protected readonly box = inject(Checkbox);
    protected readonly classes = computed(() =>
        cn(choice.indicator(), this.class()),
    );
}

/** Both parts of a checkbox, for a component's `imports`. */
export const CHECKBOX = [Checkbox, CheckboxIndicator] as const;
