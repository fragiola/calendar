import type { TimeGridColumn } from "@fragiola/calendar";
import { Fragment, h } from "vue";
import { useTimeGrid } from "../composables/use-time-grid";
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

/**
 * The days of the enclosing `Calendar.SlotRow`: calls its slot per column, after a
 * `Calendar.SlotLabel` (it renders no element of its own). The calls are this component's render,
 * not a `MemoCall` each (a time grid has hundreds of slots, and a drop changes two columns): it
 * renders again when the time grid or what its slot reads changes, and a `Calendar.Slot` whose
 * props are the same is not rendered again.
 */
export const Slots: CalendarComponent<SlotsProps, SlotsSlots> = definePrimitive<
    SlotsProps,
    SlotsSlots
>("Slots", [], (_props, { slots }) => {
    const grid = useTimeGrid();
    return () =>
        (grid.value?.columns ?? []).map((column) => {
            const cell = slots.default?.({ column });
            return h(
                Fragment,
                { key: column.date },
                Array.isArray(cell) ? cell : [cell],
            );
        });
});
