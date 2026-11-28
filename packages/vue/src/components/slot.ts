import { type SlotState, useSlotPart } from "../composables/use-slot";
import { SlotRowKey, useRequired } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface SlotProps extends PrimitiveProps {
    /** its day, from `Calendar.Slots`' slot (`column.date`) */
    date: string;
}

export interface SlotSlots extends RenderSlot<SlotState> {
    /** what it shows, with its state */
    default?: SlotFunction<SlotState>;
}

/**
 * A day's cell of a slot row (`role="gridcell"`, `data-date`, `data-time`, `data-selected`, …):
 * one cell of the grid's roving focus; a press selects from it with `selection()`.
 */
export const Slot: CalendarComponent<SlotProps, SlotSlots> = definePrimitive<
    SlotProps,
    SlotSlots
>("Slot", ["date", "as"], (props, { attrs, slots }) => {
    const row = useRequired(SlotRowKey, "Slot", "Calendar.SlotRow");
    const {
        state,
        props: own,
        ref,
    } = useSlotPart(() => ({
        date: props.date,
        time: row.value.slot.time,
    }));
    return () =>
        renderElement({
            tag: "div",
            as: props.as,
            attrs,
            render: slots.render,
            state: state.value,
            props: own.value,
            ref,
            children: () => slots.default?.(state.value),
        });
});
