import type * as React from "react";
import { useCalendarContext } from "../context";
import { type CommandButtonState, useCommandButton } from "../hooks/internal";
import {
    type ButtonPrimitiveProps,
    useRenderElement,
} from "../utils/use-render";

export type TodayState = CommandButtonState;

export interface TodayProps extends ButtonPrimitiveProps<TodayState> {
    /** its label: elements or text of the app's */
    children?: React.ReactNode;
}

/**
 * A button that goes to the range of today (`view.today`); disabled (`disabled`, `data-disabled`) when the model cannot.
 */
export function Today(props: TodayProps) {
    const { children, ...rest } = props;
    const context = useCalendarContext("Today");
    const { state, wiring, onClick } = useCommandButton(
        context,
        "today",
        {},
        () => context.model.run("view.today", {}),
    );
    return useRenderElement("button", rest, {
        state,
        ref: wiring.ref,
        props: {
            type: "button",
            ...wiring.props,
            disabled: state.disabled,
            onClick,
            children,
        },
    });
}
