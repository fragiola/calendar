import type { TimeSegment } from "@fragiola/calendar";
import type * as React from "react";
import { ColumnContext, useCalendarContext, useRequired } from "../context";
import {
    type EventState,
    eventStateOf,
    type PartHookResult,
    usePart,
} from "./internal";

/** What a timed event shows in a column (`Calendar.TimeEvent`, `useTimeEvent`). */
export interface TimeEventState extends EventState {
    /** the segment as the layout gives it: fractions of the column, its overlap columns */
    segment: TimeSegment;
}

/**
 * The structural style of a time-grid segment (D18): its layout fractions as percentages of its
 * column, on logical properties (right to left needs nothing more).
 */
export function timeSegmentStyle(segment: TimeSegment): React.CSSProperties {
    return {
        position: "absolute",
        top: `${segment.top * 100}%`,
        height: `${segment.height * 100}%`,
        insetInlineStart: `${(segment.column / segment.columns) * 100}%`,
        width: `${(segment.span / segment.columns) * 100}%`,
    };
}

/**
 * A timed occurrence's part within a time-grid column (inside `Calendar.Column`): its state and
 * the props of its element (`role="listitem"`, its ids, the roving tab stop, its registration and
 * its position as percentages of the column).
 */
export function useTimeEvent(
    segment: TimeSegment,
): PartHookResult<TimeEventState> {
    const context = useCalendarContext("useTimeEvent");
    const { column } = useRequired(
        ColumnContext,
        "useTimeEvent",
        "Calendar.Column",
    );
    const { attributes, props, ref } = usePart(context, "event", {
        occurrenceId: segment.occurrenceId,
        date: column.date,
        continuesBefore: segment.continuesBefore,
        continuesAfter: segment.continuesAfter,
    });
    return {
        state: { ...eventStateOf(attributes), segment },
        props: {
            ...props,
            ref,
            // the column layer lets presses through to its slots: an event takes its own
            style: { ...timeSegmentStyle(segment), pointerEvents: "auto" },
        },
    };
}
