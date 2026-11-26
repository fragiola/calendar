import { Directive, type Signal, signal } from "@angular/core";
import {
    bindPart,
    injectCalendarContext,
    injectHost,
} from "@fragiola/calendar-angular/internal";

export type ScrollerState = Record<never, never>;

/**
 * The element that scrolls the time grid's slots (give it a height and `overflow: auto`): the
 * engine autoscrolls it while a gesture nears its edges.
 */
@Directive({ selector: "[calendarScroller]", exportAs: "calendarScroller" })
export class CalendarScrollerDirective {
    private readonly context = injectCalendarContext("[calendarScroller]");

    /** what it shows: nothing of its own */
    readonly state: Signal<ScrollerState> = signal({}).asReadonly();

    constructor() {
        bindPart(this.context, injectHost(), "scroller", () => ({}));
    }
}
