import type { DayGridWeek } from "@fragiola/calendar";
import * as React from "react";
import { useDayGrid } from "../hooks/use-day-grid";

export interface WeeksProps {
    /** called per row of the month (`<Calendar.Week week={week}>`) */
    children: (week: DayGridWeek) => React.ReactNode;
}

/** The month's rows: calls `children` per week, in order (it renders no element of its own). */
export function Weeks(props: WeeksProps) {
    const grid = useDayGrid();
    return (
        <>
            {(grid?.weeks ?? []).map((week) => (
                <React.Fragment key={week.id}>
                    {props.children(week)}
                </React.Fragment>
            ))}
        </>
    );
}
