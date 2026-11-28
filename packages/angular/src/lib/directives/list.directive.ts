import { Directive, type Signal } from "@angular/core";
import {
    bindPart,
    calendarValue,
    injectCalendarContext,
    injectHost,
} from "@fragiola/calendar-angular/internal";

export interface ListState {
    /** no day of the range has an event (`is("list-empty")`) */
    empty: boolean;
}

/**
 * A list view's container: `<div calendarList #list="calendarList">` with its
 * `<ng-template calendarListDays let-day>` (and what you show while `list.state().empty`).
 */
@Directive({ selector: "[calendarList]", exportAs: "calendarList" })
export class CalendarListDirective {
    private readonly context = injectCalendarContext("[calendarList]");

    /** what it shows */
    readonly state: Signal<ListState> = calendarValue(
        this.context,
        () => ({
            empty: this.context.model().is("list-empty"),
        }),
        { part: "list" },
    );

    constructor() {
        bindPart(this.context, injectHost(), "list", () => ({}));
    }
}
