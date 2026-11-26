import type { TimeSlot } from "@fragiola/calendar";
import { h } from "vue";
import { useTimeGrid } from "../composables/use-time-grid";
import { MemoCall, memoSlot, type ScopeNames } from "../utils/memo-call";
import {
    type CalendarComponent,
    definePrimitive,
    type SlotFunction,
} from "../utils/primitive";

export type SlotRowsProps = Record<never, never>;

export interface SlotRowsSlots {
    /** called per slot of the time grid (`<Calendar.SlotRow :slot="slot">`) */
    default?: SlotFunction<{ slot: TimeSlot }>;
}

const NAMES: ScopeNames = ["slot"];

/** The time grid's rows of slots: calls its slot per time slot, in order (no element of its own). */
export const SlotRows: CalendarComponent<SlotRowsProps, SlotRowsSlots> =
    definePrimitive<SlotRowsProps, SlotRowsSlots>(
        "SlotRows",
        [],
        (_props, { slots }) => {
            const grid = useTimeGrid();
            const render = memoSlot(slots);
            return () =>
                (grid.value?.slots ?? []).map((slot) =>
                    h(MemoCall, {
                        key: slot.time,
                        render: render(),
                        names: NAMES,
                        a: slot,
                    }),
                );
        },
    );
