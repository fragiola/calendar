import type { TimeGridColumn, TimeSlot } from "@fragiola/calendar";
import * as React from "react";
import { SlotRowContext, useCalendarContext } from "../context";
import { usePart } from "../hooks/internal";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";
import { Slots } from "./slots";

export interface SlotRowState {
    /** the slot: its `time` (`HH:mm`) and its place in a column (`top`, `height` fractions) */
    slot: TimeSlot;
}

export interface SlotRowProps
    extends Omit<DivPrimitiveProps<SlotRowState>, "slot"> {
    /** the slot, from `Calendar.SlotRows`' children function */
    slot: TimeSlot;
    /**
     * a function called per day (`(column) => <Calendar.Slot date={column.date} />`), or elements
     * (a `Calendar.SlotLabel`, then `Calendar.Slots`)
     */
    children?: React.ReactNode | ((column: TimeGridColumn) => React.ReactNode);
}

/** A time grid's row at one time (`role="row"`, `data-time`): its label and a slot per day. */
export function SlotRow(props: SlotRowProps) {
    const { slot, children, ...rest } = props;
    const context = useCalendarContext("SlotRow");
    const part = usePart(context, "slot-row", { time: slot.time });
    const value = React.useMemo(() => ({ slot }), [slot]);
    const element = useRenderElement("div", rest, {
        state: { slot },
        ref: part.ref,
        props: {
            ...part.props,
            children:
                typeof children === "function" ? (
                    <Slots>{children}</Slots>
                ) : (
                    children
                ),
        },
    });
    return (
        <SlotRowContext.Provider value={value}>
            {element}
        </SlotRowContext.Provider>
    );
}
