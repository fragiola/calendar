import type { DayGridWeek } from "@fragiola/calendar";
import * as React from "react";
import { useDayGrid } from "../hooks/use-day-grid";
import { MemoCall } from "../utils/memo-call";

export interface WeeksProps {
    /** called per row of the month (`<Calendar.Week week={week}>`) */
    children: (week: DayGridWeek) => React.ReactNode;
}

/** The month's rows: calls `children` per week, in order (it renders no element of its own). */
export function Weeks(props: WeeksProps) {
    const render = props.children;
    const grid = useDayGrid();
    return (
        <>
            {(grid?.weeks ?? []).map((week) => (
                <React.Fragment key={week.id}>
                    <MemoCall render={render} args={[week]} />
                </React.Fragment>
            ))}
        </>
    );
}
