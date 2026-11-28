import type { TimeGridColumn } from "@fragiola/calendar";
import type * as React from "react";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "../hooks/internal";
import { useEntityCalls } from "../utils/memo-call";

export interface SlotsProps {
    /** called per day of the time grid (`<Calendar.Slot date={column.date} />`) */
    children: (column: TimeGridColumn) => React.ReactNode;
}

/**
 * The days of the enclosing `Calendar.SlotRow`: calls `children` per column, after a
 * `Calendar.SlotLabel` (it renders no element of its own).
 */
export function Slots(props: SlotsProps) {
    const render = props.children;
    const context = useCalendarContext("Slots");
    const grid = useCalendarValue(
        context,
        () => context.model.get("time-grid"),
        { part: "time-grid" },
    );
    // a slot row calls it per day: no component per call (a time grid has hundreds of slots)
    // keyed by position: the next range's slots reuse these elements (Epic #27)
    const cells = useEntityCalls(render, grid?.columns ?? [], positionOf);
    return <>{cells}</>;
}

function positionOf(_column: TimeGridColumn, index: number): string {
    return String(index);
}
