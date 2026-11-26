import type { TimeGridColumn } from "@fragiola/calendar";
import * as React from "react";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "../hooks/internal";
import { MemoCall } from "../utils/memo-call";

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
    const grid = useCalendarValue(context, () =>
        context.model.get("time-grid"),
    );
    return (
        <>
            {(grid?.columns ?? []).map((column) => (
                <React.Fragment key={column.date}>
                    <MemoCall render={render} args={[column]} />
                </React.Fragment>
            ))}
        </>
    );
}
