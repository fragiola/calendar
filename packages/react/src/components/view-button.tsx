import type { ViewType } from "@fragiola/calendar";
import type * as React from "react";
import { useCalendarContext } from "../context";
import {
    type CommandButtonState,
    flag,
    useCommandButton,
} from "../hooks/internal";
import {
    type ButtonPrimitiveProps,
    useRenderElement,
} from "../utils/use-render";

export interface ViewButtonState extends CommandButtonState {
    /** its view is the one shown (`aria-pressed`) */
    pressed: boolean;
}

export interface ViewButtonProps extends ButtonPrimitiveProps<ViewButtonState> {
    /** the view it shows (`view.set`) */
    view: ViewType;
    /** a `days` view's number of days */
    days?: number | undefined;
    /** its label: elements or text of the app's */
    children?: React.ReactNode;
}

/** A toggle button that shows a view (`view.set`), pressed (`aria-pressed`) while it is shown. */
export function ViewButton(props: ViewButtonProps) {
    const { view, days, children, ...rest } = props;
    const context = useCalendarContext("ViewButton");
    const payload = days === undefined ? { type: view } : { type: view, days };
    const { state, wiring, onClick } = useCommandButton(
        context,
        "view-button",
        payload,
        () => context.model.run("view.set", payload),
    );
    const full: ViewButtonState = {
        ...state,
        pressed: flag(wiring.attributes, "pressed"),
    };
    return useRenderElement("button", rest, {
        state: full,
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
