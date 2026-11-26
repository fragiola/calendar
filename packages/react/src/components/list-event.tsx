import type { ListItem } from "@fragiola/calendar";
import * as React from "react";
import { EventContext, ListDayContext, useRequired } from "../context";
import { splitRef } from "../hooks/internal";
import { type ListEventState, useListEvent } from "../hooks/use-list-event";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface ListEventProps extends DivPrimitiveProps<ListEventState> {
    /** the occurrence, from `Calendar.ListDay`'s children function */
    item: ListItem;
    /** the event's content (its title is model data: render it yourself), or a function of the state */
    children?: React.ReactNode | ((state: ListEventState) => React.ReactNode);
}

/** An occurrence of a list view's day (`role="listitem"`, `data-event-id`, …): a tab stop of its own. */
export function ListEvent(props: ListEventProps) {
    const { item, children, ...rest } = props;
    const { day } = useRequired(
        ListDayContext,
        "ListEvent",
        "Calendar.ListDay",
    );
    const { state, props: own } = useListEvent(item);
    const { ref, props: elementProps } = splitRef(own);
    const value = React.useMemo(
        () => ({ occurrenceId: item.occurrenceId, date: day.date }),
        [item.occurrenceId, day.date],
    );
    const element = useRenderElement("div", rest, {
        state,
        ref,
        props: {
            ...elementProps,
            children:
                typeof children === "function" ? children(state) : children,
        },
    });
    return (
        <EventContext.Provider value={value}>{element}</EventContext.Provider>
    );
}
