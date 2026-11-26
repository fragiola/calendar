import { Directive, type Signal } from "@angular/core";
import {
    type CommandButtonState,
    injectCalendarContext,
} from "@fragiola/calendar-angular/internal";
import { bindCommandButton } from "../utils/command-button";

export type PreviousState = CommandButtonState;

/**
 * A button that goes to the previous range (`view.previous`): a month back in a month view, a week in a week view; disabled (`disabled`, `data-disabled`) when the model cannot:
 * `<button calendarPrevious>`. Its label is yours.
 */
@Directive({
    selector: "[calendarPrevious]",
    exportAs: "calendarPrevious",
    host: { "(click)": "onClick()" },
})
export class CalendarPreviousDirective {
    private readonly context = injectCalendarContext("[calendarPrevious]");
    private readonly button = bindCommandButton(
        this.context,
        "previous",
        () => ({}),
    );

    /** what it shows */
    readonly state: Signal<PreviousState> = this.button.state;

    protected onClick(): void {
        this.button.click(() => this.context.model().run("view.previous", {}));
    }
}
