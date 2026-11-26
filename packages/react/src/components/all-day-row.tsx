import type { DayCell, DayGridWeek } from "@fragiola/calendar";
import * as React from "react";
import { useCalendarContext, WeekContext } from "../context";
import { usePart } from "../hooks/internal";
import { useDayGrid } from "../hooks/use-day-grid";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";
import { Days } from "./days";

export interface AllDayRowState {
    /** the all-day row as the day grid gives it */
    week: DayGridWeek;
}

export interface AllDayRowProps extends DivPrimitiveProps<AllDayRowState> {
    /**
     * a function called per day (`(day) => <Calendar.Day day={day} />`), or elements (a corner
     * cell, then `Calendar.Days`)
     */
    children?: React.ReactNode | ((day: DayCell) => React.ReactNode);
}

/**
 * The time grid's all-day row (`role="row"`), its first row after the headers: the all-day and
 * multi-day events as day-grid segments, in `Calendar.Day`s. Up from the first slot reaches it.
 */
export function AllDayRow(props: AllDayRowProps) {
    const grid = useDayGrid();
    const week = grid?.weeks[0];
    if (!week) return null;
    return <AllDayRowElement {...props} week={week} />;
}

function AllDayRowElement(props: AllDayRowProps & { week: DayGridWeek }) {
    const { week, children, ...rest } = props;
    const context = useCalendarContext("AllDayRow");
    const part = usePart(context, "all-day-row", { weekId: week.id });
    const value = React.useMemo(() => ({ week }), [week]);
    const element = useRenderElement("div", rest, {
        state: { week },
        ref: part.ref,
        props: {
            ...part.props,
            children:
                typeof children === "function" ? (
                    <Days>{children}</Days>
                ) : (
                    children
                ),
        },
    });
    return <WeekContext.Provider value={value}>{element}</WeekContext.Provider>;
}
