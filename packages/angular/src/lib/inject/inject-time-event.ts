import { inject, type Signal } from "@angular/core";
import {
    CalendarTimeEventDirective,
    type TimeEventState,
} from "../directives/time-event.directive";

/** What `injectTimeEvent` gives: the enclosing part's state. */
export interface InjectTimeEventResult {
    /** what it shows (`undefined` until its directive's input is set) */
    state: Signal<TimeEventState | undefined>;
}

/**
 * The enclosing `[calendarTimeEvent]`'s state (React's `useTimeEvent`), for a component inside it (an event's content). The directive puts the ARIA, the `data-*` and the registration on its element.
 * Call it in an injection context.
 */
export function injectTimeEvent(): InjectTimeEventResult {
    const part = inject(CalendarTimeEventDirective, { optional: true });
    if (!part)
        throw new Error(
            "injectTimeEvent must be used inside [calendarTimeEvent]",
        );
    return { state: part.state };
}
