import type { ListDay } from "@fragiola/calendar";
import { h } from "vue";
import { useListLayout } from "../composables/use-list-layout";
import { MemoCall, memoSlot, type ScopeNames } from "../utils/memo-call";
import {
    type CalendarComponent,
    definePrimitive,
    type SlotFunction,
} from "../utils/primitive";

export type ListDaysProps = Record<never, never>;

export interface ListDaysSlots {
    /**
     * called per day that has events: a heading of the app's, then
     * `<Calendar.ListDay :day="day">`
     */
    default?: SlotFunction<{ day: ListDay }>;
}

const NAMES: ScopeNames = ["day"];

/** A list view's days with events, in order (it renders no element of its own). */
export const ListDays: CalendarComponent<ListDaysProps, ListDaysSlots> =
    definePrimitive<ListDaysProps, ListDaysSlots>(
        "ListDays",
        [],
        (_props, { slots }) => {
            const layout = useListLayout();
            const render = memoSlot(slots);
            return () =>
                layout.value.days.map((day) =>
                    h(MemoCall, {
                        key: day.date,
                        render: render(),
                        names: NAMES,
                        a: day,
                    }),
                );
        },
    );
