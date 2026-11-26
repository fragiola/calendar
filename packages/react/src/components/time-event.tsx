import type { TimeSegment } from "@fragiola/calendar";
import * as React from "react";
import { ColumnContext, EventContext, useRequired } from "../context";
import { splitRef } from "../hooks/internal";
import { type TimeEventState, useTimeEvent } from "../hooks/use-time-event";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface TimeEventProps extends DivPrimitiveProps<TimeEventState> {
    /** the segment, from `Calendar.ColumnEvents`' children function */
    segment: TimeSegment;
    /** the event's content (its title is model data: render it yourself), or a function of the state */
    children?: React.ReactNode | ((state: TimeEventState) => React.ReactNode);
}

/**
 * A timed occurrence's part in a column (`role="listitem"`, `data-event-id`, …): positioned from
 * its layout fractions as percentages of the column (`top`, `height`, `inset-inline-start`,
 * `width`), focusable, draggable with `dragAndDrop()`, resizable with `resize()`.
 */
export function TimeEvent(props: TimeEventProps) {
    const { segment, children, ...rest } = props;
    const { column } = useRequired(
        ColumnContext,
        "TimeEvent",
        "Calendar.Column",
    );
    const { state, props: own } = useTimeEvent(segment);
    const { ref, style, props: elementProps } = splitRef(own);
    const value = React.useMemo(
        () => ({
            occurrenceId: segment.occurrenceId,
            date: column.date,
            timeSegment: segment,
        }),
        [segment, column.date],
    );
    const element = useRenderElement("div", rest, {
        state,
        ref,
        props: {
            ...elementProps,
            children:
                typeof children === "function" ? children(state) : children,
        },
        style,
    });
    return (
        <EventContext.Provider value={value}>{element}</EventContext.Provider>
    );
}
