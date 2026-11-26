import type { TimeGridColumn, TimeSlot } from "@fragiola/calendar";
import { computed, h, provide } from "vue";
import { usePart } from "../composables/internal";
import { SlotRowKey, useCalendarContext } from "../context";
import { passSlots } from "../utils/memo-call";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";
import { Slots } from "./slots";

export interface SlotRowState {
    /** the slot: its `time` (`HH:mm`) and its place in a column (`top`, `height` fractions) */
    slot: TimeSlot;
}

export interface SlotRowProps extends PrimitiveProps {
    /** the slot, from `Calendar.SlotRows`' slot */
    slot: TimeSlot;
}

export interface SlotRowSlots extends RenderSlot<SlotRowState> {
    /** what the row holds (a `Calendar.SlotLabel`, then `Calendar.Slots`) */
    default?: SlotFunction<SlotRowState>;
    /** called per day instead (`#column="{ column }"`: `<Calendar.Slot :date="column.date" />`) */
    column?: SlotFunction<{ column: TimeGridColumn }>;
}

/** A time grid's row at one time (`role="row"`, `data-time`): its label and a slot per day. */
export const SlotRow: CalendarComponent<SlotRowProps, SlotRowSlots> =
    definePrimitive<SlotRowProps, SlotRowSlots>(
        "SlotRow",
        ["slot", "as"],
        (props, { attrs, slots }) => {
            const context = useCalendarContext("SlotRow");
            const part = usePart(context, "slot-row", () => ({
                time: props.slot.time,
            }));
            provide(
                SlotRowKey,
                computed(() => ({ slot: props.slot })),
            );
            return () =>
                renderElement({
                    tag: "div",
                    as: props.as,
                    attrs,
                    render: slots.render,
                    state: { slot: props.slot },
                    props: part.props.value,
                    ref: part.ref,
                    children: () =>
                        slots.column
                            ? h(Slots, null, passSlots(slots, "column"))
                            : slots.default?.({ slot: props.slot }),
                });
        },
    );
