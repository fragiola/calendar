import type * as React from "react";
import { SlotRowContext, useRequired } from "../context";
import { splitRef } from "../hooks/internal";
import { type SlotState, useSlot } from "../hooks/use-slot";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface SlotProps extends DivPrimitiveProps<SlotState> {
    /** its day, from `Calendar.SlotRow`'s children function (`column.date`) */
    date: string;
    /** what it shows: elements, or a function of its state */
    children?: React.ReactNode | ((state: SlotState) => React.ReactNode);
}

/**
 * A day's cell of a slot row (`role="gridcell"`, `data-date`, `data-time`, `data-selected`, …):
 * one cell of the grid's roving focus; a press selects from it with `selection()`.
 */
export function Slot(props: SlotProps) {
    const { date, children, ...rest } = props;
    const { slot } = useRequired(SlotRowContext, "Slot", "Calendar.SlotRow");
    const { state, props: own } = useSlot({ date, time: slot.time });
    const { ref, props: elementProps } = splitRef(own);
    return useRenderElement("div", rest, {
        state,
        ref,
        props: {
            ...elementProps,
            children:
                typeof children === "function" ? children(state) : children,
        },
    });
}
