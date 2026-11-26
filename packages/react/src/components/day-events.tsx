import type { Segment } from "@fragiola/calendar";
import * as React from "react";
import { DayContext, useCalendarContext, useRequired } from "../context";
import { usePart } from "../hooks/internal";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface DayEventsState {
    /** the segments that start in the day */
    segments: readonly Segment[];
}

export interface DayEventsProps extends DivPrimitiveProps<DayEventsState> {
    /** called per segment that starts in the day (`<Calendar.Segment segment={segment} />`) */
    children: (segment: Segment) => React.ReactNode;
}

/**
 * A day's events (`role="list"`): the segments that start in it, in lane order. A multi-day
 * segment starts in its first day of the row and spans `segment.span` columns: place it from its
 * state. `dayMaxEvents: "auto"` measures this element.
 */
export function DayEvents(props: DayEventsProps) {
    const { children, ...rest } = props;
    const context = useCalendarContext("DayEvents");
    const { day, column, week } = useRequired(
        DayContext,
        "DayEvents",
        "Calendar.Day",
    );
    const part = usePart(context, "day-events", { date: day.date });
    const segments = React.useMemo(
        () => week.segments.filter((segment) => segment.startColumn === column),
        [week, column],
    );
    return useRenderElement("div", rest, {
        state: { segments },
        ref: part.ref,
        props: {
            ...part.props,
            children: segments.map((segment) => (
                <React.Fragment key={segment.occurrenceId}>
                    {children(segment)}
                </React.Fragment>
            )),
        },
    });
}
