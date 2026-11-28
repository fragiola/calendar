// A value a part shows, read from the root's model and engine (React's `useCalendarValue`, Vue's):
// read again on every change of either (the root's `version`; for a part, its revision: a model
// commit and the view changes the engine's `affects` names for it, Issue #25) and of the signals
// `read` reads (an input), the last object kept while equal (`sameValue`), so nothing that reads
// it updates.
import { computed, type Signal } from "@angular/core";
import type { PartName } from "@fragiola/calendar";
import type { CalendarContext } from "./context";

/** Two values are the same: `Object.is`, or records (or arrays) whose entries are. */
export function sameValue(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (
        typeof a !== "object" ||
        typeof b !== "object" ||
        a === null ||
        b === null ||
        Array.isArray(a) !== Array.isArray(b)
    ) {
        return false;
    }
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    return keys.every((key) =>
        Object.is(
            (a as Record<string, unknown>)[key],
            (b as Record<string, unknown>)[key],
        ),
    );
}

/** `read()` as a signal of the root's changes (or its part's), the last value kept while equal. */
export function calendarValue<S>(
    context: CalendarContext,
    read: () => S,
    options: {
        /** the part whose view changes may change the value (none: every change) */
        part?: PartName;
        equal?: (a: S, b: S) => boolean;
    } = {},
): Signal<S> {
    const { part, equal = sameValue } = options;
    const revision =
        part === undefined ? context.version : context.revision(part);
    return computed(
        () => {
            revision();
            return read();
        },
        { equal },
    );
}
