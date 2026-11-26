import { inject, type Signal } from "@angular/core";
import {
    CalendarDayDirective,
    type DayState,
} from "../directives/day.directive";

/** What `injectDay` gives: the enclosing part's state. */
export interface InjectDayResult {
    /** what it shows (`undefined` until its directive's input is set) */
    state: Signal<DayState | undefined>;
}

/**
 * The enclosing `[calendarDay]`'s state (React's `useDay`), for a component inside it (a day's menu, a badge). The directive puts the ARIA, the `data-*` and the registration on its element.
 * Call it in an injection context.
 */
export function injectDay(): InjectDayResult {
    const part = inject(CalendarDayDirective, { optional: true });
    if (!part) throw new Error("injectDay must be used inside [calendarDay]");
    return { state: part.state };
}
