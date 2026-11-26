import { inject, type Signal } from "@angular/core";
import {
    CalendarSegmentDirective,
    type SegmentState,
} from "../directives/segment.directive";

/** What `injectSegment` gives: the enclosing part's state. */
export interface InjectSegmentResult {
    /** what it shows (`undefined` until its directive's input is set) */
    state: Signal<SegmentState | undefined>;
}

/**
 * The enclosing `[calendarSegment]`'s state (React's `useSegment`), for a component inside it (an event's content). The directive puts the ARIA, the `data-*` and the registration on its element.
 * Call it in an injection context.
 */
export function injectSegment(): InjectSegmentResult {
    const part = inject(CalendarSegmentDirective, { optional: true });
    if (!part)
        throw new Error("injectSegment must be used inside [calendarSegment]");
    return { state: part.state };
}
