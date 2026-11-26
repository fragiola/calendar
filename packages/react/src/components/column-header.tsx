import type * as React from "react";
import { useCalendarContext } from "../context";
import { flag, usePart } from "../hooks/internal";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface ColumnHeaderState {
    /** its day, `YYYY-MM-DD` (a month's header stands for its weekday) */
    date: string;
    today: boolean;
    weekend: boolean;
    past: boolean;
}

export interface ColumnHeaderProps
    extends DivPrimitiveProps<ColumnHeaderState> {
    /** the day, from `Calendar.ColumnHeaders`' children function */
    date: string;
    /** what it shows (`useDayHeader(date)` gives the parts), or a function of its state */
    children?:
        | React.ReactNode
        | ((state: ColumnHeaderState) => React.ReactNode);
}

/** A column's header (`role="columnheader"`, `data-date`, `data-today`, …). */
export function ColumnHeader(props: ColumnHeaderProps) {
    const { date, children, ...rest } = props;
    const context = useCalendarContext("ColumnHeader");
    const part = usePart(context, "column-header", { date });
    const state: ColumnHeaderState = {
        date,
        today: flag(part.attributes, "today"),
        weekend: flag(part.attributes, "weekend"),
        past: flag(part.attributes, "past"),
    };
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
