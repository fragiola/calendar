import type * as React from "react";
import { useCalendarContext } from "../context";
import { usePart } from "../hooks/internal";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export type TimeGridState = Record<never, never>;

export interface TimeGridProps extends DivPrimitiveProps<TimeGridState> {
    children?: React.ReactNode;
}

/**
 * A week's, a day's or a `days` view's grid (`role="grid"`): renders its children, in rows: the
 * `Calendar.ColumnHeaders`, the `Calendar.AllDayRow`, then the `Calendar.SlotRows` (usually in a
 * `Calendar.Scroller`) with the `Calendar.Columns` layer over them. One tab stop: the keys move
 * the roving focus over its all-day days and slots.
 */
export function TimeGrid(props: TimeGridProps) {
    const { children, ...rest } = props;
    const context = useCalendarContext("TimeGrid");
    const part = usePart(context, "time-grid", {});
    return useRenderElement("div", rest, {
        state: {},
        ref: part.ref,
        props: { ...part.props, children },
    });
}
