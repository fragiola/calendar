import type { TimeSlot } from "@fragiola/calendar";
import * as React from "react";
import { useTimeGrid } from "../hooks/use-time-grid";

export interface SlotRowsProps {
    /** called per slot of the time grid (`<Calendar.SlotRow slot={slot}>`) */
    children: (slot: TimeSlot) => React.ReactNode;
}

/** The time grid's rows of slots: calls `children` per slot, in order (no element of its own). */
export function SlotRows(props: SlotRowsProps) {
    const grid = useTimeGrid();
    return (
        <>
            {(grid?.slots ?? []).map((slot) => (
                <React.Fragment key={slot.time}>
                    {props.children(slot)}
                </React.Fragment>
            ))}
        </>
    );
}
