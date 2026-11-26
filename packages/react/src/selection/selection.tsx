import type { Segment, TimeSegment } from "@fragiola/calendar";
import type * as React from "react";
import { useCalendarContext } from "../context";
import {
    previewSegmentsIn,
    useCalendarValue,
    useFeature,
    usePart,
    useWhere,
} from "../hooks/internal";
import { timeSegmentStyle } from "../hooks/use-time-event";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface SelectionState {
    /** the highlight's part here: a time-grid segment (in a column) or a day-grid segment (in a row) */
    segment: TimeSegment | Segment;
    /** the range is still being selected (a pointer, Shift + arrows), not set yet */
    pending: boolean;
}

export interface SelectionProps extends DivPrimitiveProps<SelectionState> {
    /** what it shows: elements, or a function of its state */
    children?: React.ReactNode | ((state: SelectionState) => React.ReactNode);
}

/**
 * The highlight of the range selected (or being selected) with `selection()`, laid out as an
 * event: in a `Calendar.Column` it is positioned as a timed event; in a `Calendar.Week` or
 * `Calendar.AllDayRow` it renders the row's segment, placed from its state. Hidden from assistive
 * technology (the days and slots carry `data-selected`).
 */
export function Selection(props: SelectionProps) {
    const context = useCalendarContext("Selection");
    if (!useFeature(context, "selection", "Selection")) return null;
    return <SelectionElements {...props} />;
}

function SelectionElements(props: SelectionProps) {
    const context = useCalendarContext("Selection");
    const { engine } = context;
    const where = useWhere();
    const shown = useCalendarValue(
        context,
        () => engine?.get("selection-segments") ?? null,
    );
    const pending = useCalendarValue(
        context,
        () => (engine?.get("selection-preview") ?? null) !== null,
    );
    const segments = previewSegmentsIn(shown, where);
    return (
        <>
            {segments.map((segment, index) => (
                <SelectionElement
                    // biome-ignore lint/suspicious/noArrayIndexKey: a range has one segment per place
                    key={index}
                    {...props}
                    segment={segment}
                    pending={pending}
                    timed={where.column !== undefined}
                />
            ))}
        </>
    );
}

function SelectionElement(
    props: SelectionProps & {
        segment: TimeSegment | Segment;
        pending: boolean;
        timed: boolean;
    },
) {
    const { segment, pending, timed, children, ...rest } = props;
    const context = useCalendarContext("Selection");
    const part = usePart(context, "selection", {}, false);
    const state: SelectionState = { segment, pending };
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
