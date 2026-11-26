// Tree's (fragiola/tree, packages/vue/src/composables/create-tree-ref.ts), same author and
// licence.
import type {
    AnyTypes,
    CalendarEngine,
    CalendarFeatures,
    CalendarModel,
    CalendarTypes,
} from "@fragiola/calendar";
import { markRaw, type ShallowRef, shallowRef, toRaw } from "vue";

/** What a calendar ref gives once its `Calendar.Root` is mounted: the root's model and engine. */
export interface CalendarHandle<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
> {
    model: CalendarModel<T, F>;
    engine: CalendarEngine<T, F>;
}

declare const calendarRefBrand: unique symbol;

/**
 * Access to a `Calendar.Root` from outside it (a toolbar, a menu, a test): pass it as the root's
 * `calendar-ref`; `value` is the root's model and engine while it is mounted, `null` otherwise.
 * `value` is reactive, so a render that reads it re-renders when the root mounts or unmounts.
 *
 * It is not a Vue ref: a template does not unwrap it, so `:calendar-ref="calendar"` passes the
 * calendar ref itself, and the template reads `calendar.value`, as a script does.
 */
export interface CalendarRef<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
> {
    /** the root's model and engine while it is mounted, `null` otherwise */
    readonly value: CalendarHandle<T, F> | null;
    /** only `createCalendarRef` and `useCalendarRef` make a calendar ref */
    readonly [calendarRefBrand]: true;
}

/** the reactive value behind each calendar ref, which only `Calendar.Root` sets */
const handles = new WeakMap<object, ShallowRef<CalendarHandle | null>>();

/**
 * Creates a calendar ref anywhere (a module, a test, `setup`, where `useCalendarRef` says the
 * same).
 *
 * ```ts
 * const calendar = createCalendarRef<Types>();
 * // <Calendar.Root :calendar-ref="calendar" :default-events="events">…</Calendar.Root>
 * calendar.value?.model.run("view.today", {});
 * ```
 */
export function createCalendarRef<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
>(): CalendarRef<T, F> {
    const handle = shallowRef<CalendarHandle | null>(null);
    // a plain object, never made reactive: a template neither unwraps it nor wraps it in a proxy
    const calendar = markRaw({
        get value() {
            return handle.value;
        },
    });
    handles.set(calendar, handle);
    return calendar as unknown as CalendarRef<T, F>;
}

/** @internal what `Calendar.Root` calls: attaches (or, with `null`, detaches) its handle */
export function setCalendarRef<
    T extends CalendarTypes,
    F extends CalendarFeatures,
>(calendar: CalendarRef<T, F>, handle: CalendarHandle<T, F> | null): void {
    const current = handles.get(toRaw(calendar));
    if (!current) {
        throw new TypeError(
            "Calendar.Root: `calendar-ref` takes a calendar ref from useCalendarRef or createCalendarRef",
        );
    }
    current.value = handle as unknown as CalendarHandle | null;
}
