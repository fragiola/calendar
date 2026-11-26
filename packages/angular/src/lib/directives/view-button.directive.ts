import { computed, Directive, input, type Signal } from "@angular/core";
import type { ViewType } from "@fragiola/calendar";
import {
    beforeInputs,
    type CommandButtonState,
    flag,
    injectCalendarContext,
    optionalNumber,
} from "@fragiola/calendar-angular/internal";
import { bindCommandButton } from "../utils/command-button";

export interface ViewButtonState extends CommandButtonState {
    /** its view is the one shown (`aria-pressed`) */
    pressed: boolean;
}

/**
 * A toggle button that shows a view (`view.set`), pressed (`aria-pressed`) while it is shown:
 * `<button calendarViewButton="week">`, `<button calendarViewButton="days" [days]="3">`. Its label
 * is yours.
 */
@Directive({
    selector: "[calendarViewButton]",
    exportAs: "calendarViewButton",
    host: { "(click)": "onClick()" },
})
export class CalendarViewButtonDirective {
    /** the view it shows (`view.set`) */
    readonly calendarViewButton = input.required<ViewType>();
    /** a `days` view's number of days */
    readonly days = input(undefined, { transform: optionalNumber });

    private readonly context = injectCalendarContext("[calendarViewButton]");
    private readonly payload = computed(() => {
        const type = beforeInputs(undefined, this.calendarViewButton);
        if (type === undefined) return undefined;
        const days = this.days();
        return days === undefined ? { type } : { type, days };
    });
    private readonly button = bindCommandButton(
        this.context,
        "view-button",
        this.payload,
    );

    /** what it shows */
    readonly state: Signal<ViewButtonState> = computed(() => ({
        ...this.button.state(),
        pressed: flag(this.button.attributes(), "pressed"),
    }));

    protected onClick(): void {
        const payload = this.payload();
        if (payload) {
            this.button.click(() =>
                this.context.model().run("view.set", payload),
            );
        }
    }
}
