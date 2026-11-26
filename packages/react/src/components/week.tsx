import type { DayCell, DayGridWeek } from "@fragiola/calendar";
import * as React from "react";
import { useCalendarContext, WeekContext } from "../context";
import { usePart } from "../hooks/internal";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";
import { Days } from "./days";

export interface WeekState {
    week: DayGridWeek;
}

export interface WeekProps extends DivPrimitiveProps<WeekState> {
    /** the row, from `Calendar.Weeks` */
    week: DayGridWeek;
    /**
     * a function called per day (`(day) => <Calendar.Day day={day} />`), or elements (a
     * `Calendar.WeekNumber`, then `Calendar.Days`)
     */
    children?: React.ReactNode | ((day: DayCell) => React.ReactNode);
}

/** A row of a month (`role="row"`): its days, and a week number if the app renders one. */
export function Week(props: WeekProps) {
    const { week, children, ...rest } = props;
    const context = useCalendarContext("Week");
    const part = usePart(context, "week", { weekId: week.id });
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
        // the containing block of its decorations (`Selection`, `DragPreview`)
        style: { position: "relative" },
    });
    return <WeekContext.Provider value={value}>{element}</WeekContext.Provider>;
}
