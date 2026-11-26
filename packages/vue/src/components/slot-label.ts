import { computed } from "vue";
import { usePart } from "../composables/internal";
import { SlotRowKey, useCalendarContext, useRequired } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface SlotLabelState {
    /** the slot's wall-clock start, `HH:mm` (`useSlotLabel(time)` gives it as parts) */
    time: string;
}

export interface SlotLabelProps extends PrimitiveProps {}

export interface SlotLabelSlots extends RenderSlot<SlotLabelState> {
    /** what it shows, with its state (`v-slot="{ time }"`) */
    default?: SlotFunction<SlotLabelState>;
}

/** A slot row's label (`role="rowheader"`, `data-time`): renders what the app gives it. */
export const SlotLabel: CalendarComponent<SlotLabelProps, SlotLabelSlots> =
    definePrimitive<SlotLabelProps, SlotLabelSlots>(
        "SlotLabel",
        ["as"],
        (props, { attrs, slots }) => {
            const context = useCalendarContext("SlotLabel");
            const row = useRequired(
                SlotRowKey,
                "SlotLabel",
                "Calendar.SlotRow",
            );
            const part = usePart(context, "slot-label", () => ({
                time: row.value.slot.time,
            }));
            const state = computed(() => ({ time: row.value.slot.time }));
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
