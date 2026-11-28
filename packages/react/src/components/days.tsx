import type { DayCell, DayGridWeek } from "@fragiola/calendar";
import * as React from "react";
import { useRequired, WeekContext } from "../context";
import { MemoCall } from "../utils/memo-call";

export interface DaysProps {
    /** called per day of the row (`<Calendar.Day day={day}>`) */
    children: (day: DayCell, week: DayGridWeek) => React.ReactNode;
}

/** The days of the enclosing row: calls `children` per day (it renders no element of its own). */
export function Days(props: DaysProps) {
    const render = props.children;
    const { week } = useRequired(
        WeekContext,
        "Days",
        "Calendar.Week or Calendar.AllDayRow",
    );
    return (
        <>
            {/* keyed by position: the next range's days reuse these elements (Epic #27) */}
            {week.days.map((day, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: a day cell is its position in its row
                <React.Fragment key={index}>
                    <MemoCall render={render} args={[day, week]} />
                </React.Fragment>
            ))}
        </>
    );
}
