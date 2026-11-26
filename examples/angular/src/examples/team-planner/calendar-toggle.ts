import {
    Component,
    computed,
    DestroyRef,
    inject,
    input,
    signal,
} from "@angular/core";
import { injectCalendar } from "@fragiola/calendar-angular";
import { CHECKBOX } from "#/components/ui/checkbox";
import { FIELD_PARTS } from "#/components/ui/field";
import type { Types } from "../_kit/data";
import * as styles from "./styles";

// A person's row: the checkbox follows the model (`calendar-visible`, re-read on each change).
// On the list's item: `<li [teamPlannerCalendarToggle]="calendar.id" [title]="calendar.title">`.
@Component({
    selector: "[teamPlannerCalendarToggle]",
    imports: [CHECKBOX, FIELD_PARTS],
    template: `
        <div kitFieldChoice [class]="styles.calendarRow(id())">
            <button
                kitCheckbox
                [id]="'planner-calendar-' + id()"
                [checked]="visible()"
                (checkedChange)="toggle($event)"
            >
                <span kitCheckboxIndicator></span>
            </button>
            <label kitFieldLabel [for]="'planner-calendar-' + id()">{{ title() }}</label>
            <span aria-hidden="true" [class]="styles.swatch"></span>
        </div>
    `,
})
export class CalendarToggle {
    readonly id = input.required<string>({
        alias: "teamPlannerCalendarToggle",
    });
    readonly title = input.required<string>();
    protected readonly styles = styles;
    private readonly model = injectCalendar<Types>().model;
    /** bumped on every change of the model */
    private readonly version = signal(0);
    protected readonly visible = computed(() => {
        this.version();
        return this.model().is("calendar-visible", { calendarId: this.id() });
    });

    constructor() {
        const stop = this.model().subscribe(() =>
            this.version.update((version) => version + 1),
        );
        inject(DestroyRef).onDestroy(stop);
    }

    protected toggle(checked: boolean) {
        this.model().run("calendar.set-visible", {
            calendarId: this.id(),
            visible: checked,
        });
    }
}
