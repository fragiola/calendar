import type * as React from "react";
import { useCalendarContext } from "../context";
import { type CommandButtonState, useCommandButton } from "../hooks/internal";
import {
    type ButtonPrimitiveProps,
    useRenderElement,
} from "../utils/use-render";

export type NextState = CommandButtonState;

export interface NextProps extends ButtonPrimitiveProps<NextState> {
    /** its label: elements or text of the app's */
    children?: React.ReactNode;
}

/**
 * A button that goes to the next range (`view.next`): a month on in a month view, a week in a week view; disabled (`disabled`, `data-disabled`) when the model cannot.
 */
export function Next(props: NextProps) {
    const { children, ...rest } = props;
    const context = useCalendarContext("Next");
    const { state, wiring, onClick } = useCommandButton(
        context,
        "next",
        {},
        () => context.model.run("view.next", {}),
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
