import type {
    DragPreview as Preview,
    Segment,
    TimeSegment,
} from "@fragiola/calendar";
import type * as React from "react";
import { useCalendarContext } from "../context";
import { previewSegmentsIn, usePart, useWhere } from "../hooks/internal";
import { timeSegmentStyle } from "../hooks/use-time-event";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";
import { useDragPreview } from "./use-drag-preview";

export interface DragPreviewState {
    /** the moved, resized or dropped-in occurrence where it would land: its times */
    preview: Preview;
    /** its part here: a time-grid segment (in a column) or a day-grid segment (in a row) */
    segment: TimeSegment | Segment;
}

export interface DragPreviewProps extends DivPrimitiveProps<DragPreviewState> {
    /** what it shows (the event's look, its new times): elements, or a function of its state */
    children?: React.ReactNode | ((state: DragPreviewState) => React.ReactNode);
}

/**
 * Where a drag (`dragAndDrop()`, `externalDrop()`) or a resize (`resize()`) would put the
 * occurrence, laid out as the event: in a `Calendar.Column` it is positioned as a timed event; in
 * a `Calendar.Week` or `Calendar.AllDayRow` it renders the row's segment, placed from its state.
 * Rendered only while there is a target; hidden from assistive technology (`onAnnounce` tells).
 */
export function DragPreview(props: DragPreviewProps) {
    const preview = useDragPreview();
    const where = useWhere();
    const segments = previewSegmentsIn(preview, where);
    if (!preview) return null;
    return (
        <>
            {segments.map((segment, index) => (
                <DragPreviewElement
                    // biome-ignore lint/suspicious/noArrayIndexKey: a preview has one segment per place
                    key={index}
                    {...props}
                    preview={preview}
                    segment={segment}
                    timed={where.column !== undefined}
                />
            ))}
        </>
    );
}

function DragPreviewElement(
    props: DragPreviewProps & {
        preview: Preview;
        segment: TimeSegment | Segment;
        timed: boolean;
    },
) {
    const { preview, segment, timed, children, ...rest } = props;
    const context = useCalendarContext("DragPreview");
    const part = usePart(context, "drag-preview", {}, false);
    const state: DragPreviewState = { preview, segment };
    return useRenderElement("div", rest, {
        state,
        ref: part.ref,
        props: {
            ...part.props,
            children:
                typeof children === "function" ? children(state) : children,
        },
        style: timed ? timeSegmentStyle(segment as TimeSegment) : undefined,
    });
}
