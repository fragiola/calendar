import type { DayCell, DayGridWeek } from "@fragiola/calendar";
import * as React from "react";
import { useRequired, WeekContext } from "../context";

export interface DaysProps {
    /** called per day of the row (`<Calendar.Day day={day}>`) */
    children: (day: DayCell, week: DayGridWeek) => React.ReactNode;
}

/** The days of the enclosing row: calls `children` per day (it renders no element of its own). */
export function Days(props: DaysProps) {
    const { week } = useRequired(
        WeekContext,
        "Days",
        "Calendar.Week or Calendar.AllDayRow",
    );
    return (
        <>
            {week.days.map((day) => (
                <React.Fragment key={day.date}>
                    {props.children(day, week)}
                </React.Fragment>
            ))}
        </>
    );
}
