import type * as React from "react";
import { useCalendarContext } from "../context";
import { usePart } from "../hooks/internal";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export type DayGridState = Record<never, never>;

export interface DayGridProps extends DivPrimitiveProps<DayGridState> {
    children?: React.ReactNode;
}

/**
 * A month's grid (`role="grid"`): renders its children, the `Calendar.ColumnHeaders` row and the
 * `Calendar.Weeks`. One tab stop: the keys move the roving focus over its days.
 */
export function DayGrid(props: DayGridProps) {
    const { children, ...rest } = props;
    const context = useCalendarContext("DayGrid");
    const part = usePart(context, "day-grid", {});
    return useRenderElement("div", rest, {
        state: {},
        ref: part.ref,
        props: { ...part.props, children },
    });
}
