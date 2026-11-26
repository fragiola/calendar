import { Directive, type Signal } from "@angular/core";
import {
    type CommandButtonState,
    injectCalendarContext,
} from "@fragiola/calendar-angular/internal";
import { bindCommandButton } from "../utils/command-button";

export type NextState = CommandButtonState;

/**
 * A button that goes to the next range (`view.next`): a month on in a month view, a week in a week view; disabled (`disabled`, `data-disabled`) when the model cannot:
 * `<button calendarNext>`. Its label is yours.
 */
@Directive({
    selector: "[calendarNext]",
    exportAs: "calendarNext",
    host: { "(click)": "onClick()" },
})
export class CalendarNextDirective {
    private readonly context = injectCalendarContext("[calendarNext]");
    private readonly button = bindCommandButton(
        this.context,
        "next",
        () => ({}),
    );

    /** what it shows */
    readonly state: Signal<NextState> = this.button.state;

    protected onClick(): void {
        this.button.click(() => this.context.model().run("view.next", {}));
    }
}
