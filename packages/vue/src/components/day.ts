import type { DayCell, Segment } from "@fragiola/calendar";
import { computed, provide } from "vue";
import { splitRef } from "../composables/internal";
import { type DayState, useDay } from "../composables/use-day";
import { DayKey, useRequired, WeekKey } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface DayProps extends PrimitiveProps {
    /** the day, from `Calendar.Days`' slot */
    day: DayCell;
}

/** What a day's slot receives: its state, and the segments that start in it. */
export interface DaySlotScope extends DayState {
    segments: readonly Segment[];
}

export interface DaySlots extends RenderSlot<DayState> {
    /** what it holds (a date label, `Calendar.DayEvents`, `Calendar.More`) */
    default?: SlotFunction<DaySlotScope>;
}

/**
 * A day of a month or of the all-day row (`role="gridcell"`, `data-date`, `data-today`, …): one
 * cell of the grid's roving focus. Enter moves focus into its events.
 */
export const Day: CalendarComponent<DayProps, DaySlots> = definePrimitive<
    DayProps,
    DaySlots
>("Day", ["day", "as"], (props, { attrs, slots }) => {
    const row = useRequired(
        WeekKey,
        "Day",
        "Calendar.Week or Calendar.AllDayRow",
    );
    const column = computed(() =>
        row.value.week.days.findIndex((one) => one.date === props.day.date),
    );
    const { state, props: own } = useDay(() => props.day);
    provide(
        DayKey,
        computed(() => ({
            day: props.day,
            column: column.value,
            week: row.value.week,
        })),
    );
    return () => {
        const { ref, props: elementProps } = splitRef(own.value);
        return renderElement({
            tag: "div",
            as: props.as,
            attrs,
            render: slots.render,
            state: state.value,
            props: elementProps,
            ref,
            children: () =>
                slots.default?.({
                    ...state.value,
                    segments: row.value.week.segments.filter(
                        (segment) => segment.startColumn === column.value,
                    ),
                }),
        });
    };
});
