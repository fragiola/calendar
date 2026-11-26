import type { TimeSegment } from "@fragiola/calendar";
import * as React from "react";
import { ColumnContext, useCalendarContext, useRequired } from "../context";
import { usePart } from "../hooks/internal";
import { MemoCall, useLatest } from "../utils/memo-call";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface ColumnEventsState {
    /** the column's timed segments */
    segments: readonly TimeSegment[];
}

export interface ColumnEventsProps
    extends DivPrimitiveProps<ColumnEventsState> {
    /** called per timed segment of the day (`<Calendar.TimeEvent segment={segment} />`) */
    children: (segment: TimeSegment) => React.ReactNode;
}

/**
 * A day's timed events (`role="list"`), positioned in its column: Enter on a slot moves focus to
 * the events that start in it, Up and Down move between them.
 */
export function ColumnEvents(props: ColumnEventsProps) {
    const render = useLatest(props.children);
    const { children, ...rest } = props;
    const context = useCalendarContext("ColumnEvents");
    const { column } = useRequired(
        ColumnContext,
        "ColumnEvents",
        "Calendar.Column",
    );
    const part = usePart(context, "column-events", { date: column.date });
    return useRenderElement("div", rest, {
        state: { segments: column.segments },
        ref: part.ref,
        props: {
            ...part.props,
            children: column.segments.map((segment) => (
                <React.Fragment key={segment.occurrenceId}>
                    <MemoCall render={render} args={[segment]} />
                </React.Fragment>
            )),
        },
        // the column's containing block, for its events' percentages
        style: { position: "absolute", inset: 0 },
    });
}
