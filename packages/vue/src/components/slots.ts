import type { TimeGridColumn } from "@fragiola/calendar";
import { h } from "vue";
import { useTimeGrid } from "../composables/use-time-grid";
import { MemoCall, memoSlot, type ScopeNames } from "../utils/memo-call";
import {
    type CalendarComponent,
    definePrimitive,
    type SlotFunction,
} from "../utils/primitive";

export type SlotsProps = Record<never, never>;

export interface SlotsSlots {
    /** called per day of the time grid (`<Calendar.Slot :date="column.date" />`) */
    default?: SlotFunction<{ column: TimeGridColumn }>;
}

const NAMES: ScopeNames = ["column"];

/**
 * The days of the enclosing `Calendar.SlotRow`: calls its slot per column, after a
 * `Calendar.SlotLabel` (it renders no element of its own).
 */
export const Slots: CalendarComponent<SlotsProps, SlotsSlots> = definePrimitive<
    SlotsProps,
    SlotsSlots
>("Slots", [], (_props, { slots }) => {
    const grid = useTimeGrid();
    const render = memoSlot(slots);
    return () =>
        (grid.value?.columns ?? []).map((column) =>
            h(MemoCall, {
                key: column.date,
                render: render(),
                names: NAMES,
                a: column,
            }),
        );
});
