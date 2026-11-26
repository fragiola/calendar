import type { DayCell, Segment } from "@fragiola/calendar";
import * as React from "react";
import { DayContext, useRequired, WeekContext } from "../context";
import { splitRef } from "../hooks/internal";
import { type DayState, useDay } from "../hooks/use-day";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface DayProps extends DivPrimitiveProps<DayState> {
    /** the day, from `Calendar.Week`'s children function */
    day: DayCell;
    /**
     * elements (a date label, `Calendar.DayEvents`, `Calendar.More`), or a function of the day and
     * the segments that start in it
     */
    children?:
        | React.ReactNode
        | ((day: DayCell, segments: readonly Segment[]) => React.ReactNode);
}

/** The segments of a row that start in its column. */
function startingIn(
    segments: readonly Segment[],
    column: number,
): readonly Segment[] {
    return segments.filter((segment) => segment.startColumn === column);
}

/**
 * A day of a month or of the all-day row (`role="gridcell"`, `data-date`, `data-today`, …): one
 * cell of the grid's roving focus. Enter moves focus into its events.
 */
export function Day(props: DayProps) {
    const { day, children, ...rest } = props;
    const { week } = useRequired(
        WeekContext,
        "Day",
        "Calendar.Week or Calendar.AllDayRow",
    );
    const column = week.days.findIndex((one) => one.date === day.date);
    const { state, props: own } = useDay(day);
    const { ref, props: elementProps } = splitRef(own);
    const value = React.useMemo(
        () => ({ day, column, week }),
        [day, column, week],
    );
    const element = useRenderElement("div", rest, {
        state,
        ref,
        props: {
            ...elementProps,
            children:
                typeof children === "function"
                    ? children(day, startingIn(week.segments, column))
                    : children,
        },
    });
    return <DayContext.Provider value={value}>{element}</DayContext.Provider>;
}
