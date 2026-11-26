// Tree's (fragiola/tree, packages/react/src/hooks/use-tree-ref.ts), same author and licence.
import type {
    AnyTypes,
    CalendarFeatures,
    CalendarTypes,
} from "@fragiola/calendar";
import * as React from "react";
import {
    type CalendarRef,
    createCalendarRef,
    subscribeCalendarRef,
} from "./create-calendar-ref";

/**
 * A calendar ref kept by this component, which re-renders when the `Calendar.Root` it is given to mounts
 * or unmounts: read `calendar.current` in render (a toolbar next to the calendar) or in handlers.
 *
 * ```tsx
 * const calendar = useCalendarRef<Types>();
 * <button onClick={() => calendar.current?.model.run("view.next", {})}>Next</button>
 * <Calendar.Root calendarRef={calendar}>…</Calendar.Root>
 * ```
 */
export function useCalendarRef<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
>(): CalendarRef<T, F> {
    const [ref] = React.useState(() => createCalendarRef<T, F>());
    const subscribe = React.useCallback(
        (onChange: () => void) => subscribeCalendarRef(ref, onChange),
        [ref],
    );
    const snapshot = () => ref.current;
    React.useSyncExternalStore(subscribe, snapshot, () => null);
    return ref;
}
