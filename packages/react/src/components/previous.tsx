import type * as React from "react";
import { useCalendarContext } from "../context";
import { type CommandButtonState, useCommandButton } from "../hooks/internal";
import {
    type ButtonPrimitiveProps,
    useRenderElement,
} from "../utils/use-render";

export type PreviousState = CommandButtonState;

export interface PreviousProps extends ButtonPrimitiveProps<PreviousState> {
    /** its label: elements or text of the app's */
    children?: React.ReactNode;
}

/**
 * A button that goes to the previous range (`view.previous`): a month back in a month view, a week in a week view; disabled (`disabled`, `data-disabled`) when the model cannot.
 */
export function Previous(props: PreviousProps) {
    const { children, ...rest } = props;
    const context = useCalendarContext("Previous");
    const { state, wiring, onClick } = useCommandButton(
        context,
        "previous",
        {},
        () => context.model.run("view.previous", {}),
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
