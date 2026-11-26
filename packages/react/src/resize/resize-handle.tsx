import type * as React from "react";
import { EventContext, useCalendarContext, useRequired } from "../context";
import { useFeature, usePart } from "../hooks/internal";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface ResizeHandleState {
    /** the edge it moves */
    edge: "start" | "end";
}

export interface ResizeHandleProps
    extends DivPrimitiveProps<ResizeHandleState> {
    /** the edge it moves: the event's `start` or its `end` */
    edge: "start" | "end";
    children?: React.ReactNode;
}

/**
 * A handle that resizes its event from one edge (`resize()`), inside a `Calendar.Segment` or a
 * `Calendar.TimeEvent` (`data-edge`; place it at the edge yourself). Hidden from assistive
 * technology: the keyboard resizes a grabbed event with Shift + arrows.
 */
export function ResizeHandle(props: ResizeHandleProps) {
    const context = useCalendarContext("ResizeHandle");
    if (!useFeature(context, "resize", "ResizeHandle")) return null;
    return <ResizeHandleElement {...props} />;
}

function ResizeHandleElement(props: ResizeHandleProps) {
    const { edge, children, ...rest } = props;
    const context = useCalendarContext("ResizeHandle");
    const event = useRequired(
        EventContext,
        "ResizeHandle",
        "Calendar.Segment or Calendar.TimeEvent",
    );
    const part = usePart(context, "resize-handle", {
        occurrenceId: event.occurrenceId,
        date: event.date,
        edge,
    });
    return useRenderElement("div", rest, {
        state: { edge },
        ref: part.ref,
        props: { ...part.props, children },
    });
}
