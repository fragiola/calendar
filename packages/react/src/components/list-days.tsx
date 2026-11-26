import type { ListDay } from "@fragiola/calendar";
import * as React from "react";
import { useListLayout } from "../hooks/use-list-layout";

export interface ListDaysProps {
    /**
     * called per day that has events: a heading of the app's, then
     * `<Calendar.ListDay day={day}>`
     */
    children: (day: ListDay) => React.ReactNode;
}

/** A list view's days with events, in order (it renders no element of its own). */
export function ListDays(props: ListDaysProps) {
    const layout = useListLayout();
    return (
        <>
            {layout.days.map((day) => (
                <React.Fragment key={day.date}>
                    {props.children(day)}
                </React.Fragment>
            ))}
        </>
    );
}
