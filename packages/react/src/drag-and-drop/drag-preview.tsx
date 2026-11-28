import type {
    DragPreview as Preview,
    Segment,
    TimeSegment,
} from "@fragiola/calendar";
import type * as React from "react";
import { useCalendarContext } from "../context";
import {
    previewSegmentsIn,
    previewStyle,
    useCalendarValue,
    usePart,
    useWhere,
} from "../hooks/internal";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";
import { previewOf } from "./use-drag-preview";

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
 * a `Calendar.Week` or `Calendar.AllDayRow` it renders the row's segment, over its days (the row is its containing block; `--calendar-row-inset` is the row's
 * space before its first day: a week number, a label).
 * Rendered only while there is a target; hidden from assistive technology (`onAnnounce` tells).
 */
export function DragPreview(props: DragPreviewProps) {
    const context = useCalendarContext("DragPreview");
    const where = useWhere();
    // the preview where this one is: a move elsewhere keeps it null (no re-render here)
    const shown = useCalendarValue(
        context,
        () => {
            const preview = previewOf(context.engine);
            const segments = previewSegmentsIn(preview, where);
            return preview && segments.length > 0
                ? { preview, segments }
                : null;
        },
        { part: "drag-preview" },
    );
    if (!shown) return null;
    const { preview, segments } = shown;
    return (
        <>
            {segments.map((segment, index) => (
                <DragPreviewElement
                    // biome-ignore lint/suspicious/noArrayIndexKey: a preview has one segment per place
                    key={index}
                    {...props}
                    preview={preview}
                    segment={segment}
                    where={where}
                />
            ))}
        </>
    );
}

function DragPreviewElement(
    props: DragPreviewProps & {
        preview: Preview;
        segment: TimeSegment | Segment;
        where: ReturnType<typeof useWhere>;
    },
) {
    const { preview, segment, where, children, ...rest } = props;
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
        style: previewStyle(segment, where),
    });
}
