import type * as React from "react";
import { useCalendarContext } from "../context";
import { useCalendarValue, usePart } from "../hooks/internal";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface ListState {
    /** no day of the range has an event (`is("list-empty")`) */
    empty: boolean;
}

export interface ListProps extends DivPrimitiveProps<ListState> {
    /** `Calendar.ListDays` (and what the app shows when `state.empty`) */
    children?: React.ReactNode | ((state: ListState) => React.ReactNode);
}

/** A list view's container: its days, each a list under the heading the app renders. */
export function List(props: ListProps) {
    const { children, ...rest } = props;
    const context = useCalendarContext("List");
    const part = usePart(context, "list", {});
    const empty = useCalendarValue(context, () =>
        context.model.is("list-empty"),
    );
    const state = { empty };
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
