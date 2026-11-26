import type { DayGridWeek } from "@fragiola/calendar";
import { h } from "vue";
import { useDayGrid } from "../composables/use-day-grid";
import { MemoCall, memoSlot, type ScopeNames } from "../utils/memo-call";
import {
    type CalendarComponent,
    definePrimitive,
    type SlotFunction,
} from "../utils/primitive";

export type WeeksProps = Record<never, never>;

export interface WeeksSlots {
    /** called per row of the month (`<Calendar.Week :week="week">`) */
    default?: SlotFunction<{ week: DayGridWeek }>;
}

const NAMES: ScopeNames = ["week"];

/** The month's rows: calls its slot per week, in order (it renders no element of its own). */
export const Weeks: CalendarComponent<WeeksProps, WeeksSlots> = definePrimitive<
    WeeksProps,
    WeeksSlots
>("Weeks", [], (_props, { slots }) => {
    const grid = useDayGrid();
    const render = memoSlot(slots);
    return () =>
        (grid.value?.weeks ?? []).map((week) =>
            h(MemoCall, {
                key: week.id,
                render: render(),
                names: NAMES,
                a: week,
            }),
        );
});
