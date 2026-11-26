import type * as React from "react";
import { SlotRowContext, useCalendarContext, useRequired } from "../context";
import { usePart } from "../hooks/internal";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface SlotLabelState {
    /** the slot's wall-clock start, `HH:mm` (`useSlotLabel(time)` gives it as parts) */
    time: string;
}

export interface SlotLabelProps extends DivPrimitiveProps<SlotLabelState> {
    /** what it shows: elements, or a function of its state */
    children?: React.ReactNode | ((state: SlotLabelState) => React.ReactNode);
}

/** A slot row's label (`role="rowheader"`, `data-time`): renders what the app gives it. */
export function SlotLabel(props: SlotLabelProps) {
    const { children, ...rest } = props;
    const context = useCalendarContext("SlotLabel");
    const { slot } = useRequired(
        SlotRowContext,
        "SlotLabel",
        "Calendar.SlotRow",
    );
    const part = usePart(context, "slot-label", { time: slot.time });
    const state = { time: slot.time };
    return useRenderElement("div", rest, {
        state,
        ref: part.ref,
        props: {
            ...part.props,
            children:
                typeof children === "function" ? children(state) : children,
        },
    });
}
