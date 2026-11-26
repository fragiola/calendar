import type * as React from "react";
import { useCalendarContext, useRequired, WeekContext } from "../context";
import { usePart } from "../hooks/internal";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface WeekNumberState {
    /** the row's week number, under the `weekNumbers` setting */
    weekNumber: number;
}

export interface WeekNumberProps extends DivPrimitiveProps<WeekNumberState> {
    /** what it shows: elements, or a function of its state (`(s) => s.weekNumber`) */
    children?: React.ReactNode | ((state: WeekNumberState) => React.ReactNode);
}

/**
 * The row header of a month's row (`role="rowheader"`): renders what the app gives it. Give the
 * root `weekNumberColumn`, so the grid counts its column (a missing one warns once).
 */
export function WeekNumber(props: WeekNumberProps) {
    const { children, ...rest } = props;
    const context = useCalendarContext("WeekNumber");
    const { week } = useRequired(WeekContext, "WeekNumber", "Calendar.Week");
    if (!context.partOptions.weekNumberColumn) {
        context.warn(
            "Calendar.WeekNumber is rendered without the root's weekNumberColumn: the grid does not count its column (aria-colcount)",
        );
    }
    const part = usePart(context, "week-number", { weekId: week.id });
    const state = { weekNumber: week.weekNumber };
    return useRenderElement("div", rest, {
        state,
        ref: part.ref,
        props: {
            ...part.props,
            children:
                typeof children === "function" ? children(state) : children,
        },
    });
}
