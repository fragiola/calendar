// From packages/react/src/hooks/create-calendar-ref.ts (Tree's), with the value in a signal (Flow's
// Angular `createFlowRef`): a template or a computed that reads `calendar.current` follows the root
// as it attaches and detaches, so Angular needs no re-render of its own (`injectCalendarRef` is the
// same ref, made in a field).
import { signal, untracked, type WritableSignal } from "@angular/core";
import type {
    AnyTypes,
    CalendarEngine,
    CalendarFeatures,
    CalendarModel,
    CalendarTypes,
} from "@fragiola/calendar";

/** What a calendar ref gives once its `[calendarRoot]` is rendered: the root's model and engine. */
export interface CalendarHandle<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
> {
    readonly model: CalendarModel<T, F>;
    readonly engine: CalendarEngine<T, F>;
}

/**
 * Access to a `[calendarRoot]` from outside it (a toolbar, a menu, a test): pass it as the root's
 * `calendarRef`; `current` is the root's model and engine while it lives, `null` otherwise.
 * Reading `current` in a template, a `computed` or an `effect` follows it.
 */
export interface CalendarRef<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
> {
    readonly current: CalendarHandle<T, F> | null;
}

const slots = new WeakMap<object, WritableSignal<CalendarHandle | null>>();

function slotOf(ref: object): WritableSignal<CalendarHandle | null> {
    const slot = slots.get(ref);
    if (!slot)
        throw new Error("not a calendar ref: create it with createCalendarRef");
    return slot;
}

/**
 * Creates a calendar ref, anywhere (a module, a service, a test, a component's field).
 *
 * ```ts
 * readonly calendar = createCalendarRef<Types>();
 * // <div calendarRoot [calendarRef]="calendar" [defaultEvents]="events">…</div>
 * next() { this.calendar.current?.model.run("view.next", {}); }
 * ```
 */
export function createCalendarRef<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
>(): CalendarRef<T, F> {
    const slot = signal<CalendarHandle | null>(null);
    const ref: CalendarRef<T, F> = Object.freeze({
        get current() {
            return slot() as unknown as CalendarHandle<T, F> | null;
        },
    });
    slots.set(ref, slot);
    return ref;
}

/** @internal what `[calendarRoot]` calls: attaches (or, with `null`, detaches) its model and engine */
export function setCalendarRef<
    T extends CalendarTypes,
    F extends CalendarFeatures,
>(ref: CalendarRef<T, F>, handle: CalendarHandle<T, F> | null): void {
    const slot = slotOf(ref);
    if ((untracked(slot) as unknown) === handle) return;
    slot.set(handle as unknown as CalendarHandle | null);
}
