import type { Segment as SegmentLayout } from "@fragiola/calendar";
import * as React from "react";
import { EventContext, useRequired, WeekContext } from "../context";
import { splitRef } from "../hooks/internal";
import { type SegmentState, useSegment } from "../hooks/use-segment";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface SegmentProps extends DivPrimitiveProps<SegmentState> {
    /** the segment, from `Calendar.DayEvents`' children function */
    segment: SegmentLayout;
    /** the event's content (its title is model data: render it yourself), or a function of the state */
    children?: React.ReactNode | ((state: SegmentState) => React.ReactNode);
}

/**
 * An occurrence's part in a day-grid row (`role="listitem"`, `data-event-id`, …): focusable,
 * draggable with `dragAndDrop()`. It sets no geometry: place it from `state.segment`
 * (`startColumn`, `span`, `lane`) in `className` / `style` functions.
 */
export function Segment(props: SegmentProps) {
    const { segment, children, ...rest } = props;
    const { state, props: own } = useSegment(segment);
    const { ref, props: elementProps } = splitRef(own);
    const { week } = useRequired(
        WeekContext,
        "Segment",
        "Calendar.Week or Calendar.AllDayRow",
    );
    const date = week.days[segment.startColumn]?.date ?? week.id;
    const value = React.useMemo(
        () => ({ occurrenceId: segment.occurrenceId, date }),
        [segment.occurrenceId, date],
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
