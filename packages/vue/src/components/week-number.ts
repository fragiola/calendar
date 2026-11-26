import { computed } from "vue";
import { usePart } from "../composables/internal";
import { useCalendarContext, useRequired, WeekKey } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface WeekNumberState {
    /** the row's week number, under the `weekNumbers` setting */
    weekNumber: number;
}

export interface WeekNumberProps extends PrimitiveProps {}

export interface WeekNumberSlots extends RenderSlot<WeekNumberState> {
    /** what it shows, with its state (`v-slot="{ weekNumber }"`) */
    default?: SlotFunction<WeekNumberState>;
}

/** The row header of a month's row (`role="rowheader"`): renders what the app gives it. */
export const WeekNumber: CalendarComponent<WeekNumberProps, WeekNumberSlots> =
    definePrimitive<WeekNumberProps, WeekNumberSlots>(
        "WeekNumber",
        ["as"],
        (props, { attrs, slots }) => {
            const context = useCalendarContext("WeekNumber");
            const row = useRequired(WeekKey, "WeekNumber", "Calendar.Week");
            const part = usePart(context, "week-number", () => ({
                weekId: row.value.week.id,
            }));
            const state = computed(() => ({
                weekNumber: row.value.week.weekNumber,
            }));
            return () =>
                renderElement({
                    tag: "div",
                    as: props.as,
                    attrs,
                    render: slots.render,
                    state: state.value,
                    props: part.props.value,
                    ref: part.ref,
                    children: () => slots.default?.(state.value),
                });
        },
    );
