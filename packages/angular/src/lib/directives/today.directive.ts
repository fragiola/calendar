import { Directive, type Signal } from "@angular/core";
import {
    type CommandButtonState,
    injectCalendarContext,
} from "@fragiola/calendar-angular/internal";
import { bindCommandButton } from "../utils/command-button";

export type TodayState = CommandButtonState;

/**
 * A button that goes to the range of today (`view.today`); disabled (`disabled`, `data-disabled`) when the model cannot:
 * `<button calendarToday>`. Its label is yours.
 */
@Directive({
    selector: "[calendarToday]",
    exportAs: "calendarToday",
    host: { "(click)": "onClick()" },
})
export class CalendarTodayDirective {
    private readonly context = injectCalendarContext("[calendarToday]");
    private readonly button = bindCommandButton(
        this.context,
        "today",
        () => ({}),
    );

    /** what it shows */
    readonly state: Signal<TodayState> = this.button.state;

    protected onClick(): void {
        this.button.click(() => this.context.model().run("view.today", {}));
    }
}
