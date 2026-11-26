import type {
    AnyTypes,
    CalendarFeatures,
    CalendarTypes,
} from "@fragiola/calendar";
import { type CalendarRef, createCalendarRef } from "./create-calendar-ref";

/**
 * A calendar ref kept by the component that makes it (React's `useCalendarRef`): give it to a
 * `[calendarRoot]` and read `calendar.current` in the template (a toolbar next to the calendar) or
 * in handlers. Its `current` is a signal's value, so the template follows the root as it attaches
 * and detaches; it is `createCalendarRef()`, named for a field next to the other injection
 * functions.
 *
 * ```ts
 * readonly calendar = injectCalendarRef<Types>();
 * // <button type="button" (click)="calendar.current?.model.run('view.next', {})">Next</button>
 * // <div calendarRoot [calendarRef]="calendar">…</div>
 * ```
 */
export function injectCalendarRef<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
>(): CalendarRef<T, F> {
    return createCalendarRef<T, F>();
}
