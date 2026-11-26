import { inject, type Signal } from "@angular/core";
import {
    CalendarSlotDirective,
    type SlotState,
} from "../directives/slot.directive";

/** What `injectSlot` gives: the enclosing part's state. */
export interface InjectSlotResult {
    /** what it shows (`undefined` until its directive's input is set) */
    state: Signal<SlotState | undefined>;
}

/**
 * The enclosing `[calendarSlot]`'s state (React's `useSlot`), for a component inside it. The directive puts the ARIA, the `data-*` and the registration on its element.
 * Call it in an injection context.
 */
export function injectSlot(): InjectSlotResult {
    const part = inject(CalendarSlotDirective, { optional: true });
    if (!part) throw new Error("injectSlot must be used inside [calendarSlot]");
    return { state: part.state };
}
