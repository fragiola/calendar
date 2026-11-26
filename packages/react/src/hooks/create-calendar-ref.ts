// Tree's (fragiola/tree, packages/react/src/hooks/create-tree-ref.ts), same author and licence.
import type {
    AnyTypes,
    CalendarEngine,
    CalendarFeatures,
    CalendarModel,
    CalendarTypes,
} from "@fragiola/calendar";

/** What a calendar ref gives once its `Calendar.Root` is mounted: the root's model and engine. */
export interface CalendarHandle<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
> {
    model: CalendarModel<T, F>;
    engine: CalendarEngine<T, F>;
}

/**
 * Access to a `Calendar.Root` from outside it (a toolbar, a menu, a test): pass it as the root's
 * `calendarRef`; `current` is the root's model and engine while it is mounted, `null` otherwise.
 */
export interface CalendarRef<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
> {
    readonly current: CalendarHandle<T, F> | null;
}

interface RefSlot {
    handle: CalendarHandle | null;
    readonly listeners: Set<() => void>;
}

const slots = new WeakMap<object, RefSlot>();

function slotOf(ref: object): RefSlot {
    const slot = slots.get(ref);
    if (!slot)
        throw new Error("not a calendar ref: create it with createCalendarRef");
    return slot;
}

/**
 * Creates a calendar ref outside React (a module, a test). In a component, `useCalendarRef` keeps one and
 * re-renders when it attaches.
 *
 * ```tsx
 * const calendar = createCalendarRef<Types>();
 * <Calendar.Root calendarRef={calendar} defaultEvents={events}>…</Calendar.Root>;
 * calendar.current?.model.run("view.today", {});
 * ```
 */
export function createCalendarRef<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
>(): CalendarRef<T, F> {
    const slot: RefSlot = { handle: null, listeners: new Set() };
    const ref: CalendarRef<T, F> = Object.freeze({
        get current() {
            return slot.handle as unknown as CalendarHandle<T, F> | null;
        },
    });
    slots.set(ref, slot);
    return ref;
}

/** @internal what `Calendar.Root` calls: attaches (or, with `null`, detaches) its handle */
export function setCalendarRef<
    T extends CalendarTypes,
    F extends CalendarFeatures,
>(ref: CalendarRef<T, F>, handle: CalendarHandle<T, F> | null): void {
    const slot = slotOf(ref);
    if ((slot.handle as unknown) === handle) return;
    slot.handle = handle as unknown as CalendarHandle | null;
    for (const listener of [...slot.listeners]) listener();
}

/** @internal calls `listener` when the ref attaches or detaches; returns its remover */
export function subscribeCalendarRef<
    T extends CalendarTypes,
    F extends CalendarFeatures,
>(ref: CalendarRef<T, F>, listener: () => void): () => void {
    const { listeners } = slotOf(ref);
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
