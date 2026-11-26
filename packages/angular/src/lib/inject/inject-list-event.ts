import { inject, type Signal } from "@angular/core";
import {
    CalendarListEventDirective,
    type ListEventState,
} from "../directives/list-event.directive";

/** What `injectListEvent` gives: the enclosing part's state. */
export interface InjectListEventResult {
    /** what it shows (`undefined` until its directive's input is set) */
    state: Signal<ListEventState | undefined>;
}

/**
 * The enclosing `[calendarListEvent]`'s state (React's `useListEvent`), for a component inside it. The directive puts the ARIA, the `data-*` and the registration on its element.
 * Call it in an injection context.
 */
export function injectListEvent(): InjectListEventResult {
    const part = inject(CalendarListEventDirective, { optional: true });
    if (!part)
        throw new Error(
            "injectListEvent must be used inside [calendarListEvent]",
        );
    return { state: part.state };
}
