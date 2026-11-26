import type { TimeGridColumn } from "@fragiola/calendar";
import * as React from "react";
import { useCalendarContext } from "../context";
import { usePart } from "../hooks/internal";
import { useTimeGrid } from "../hooks/use-time-grid";
import { MemoCall } from "../utils/memo-call";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export type ColumnsState = Record<never, never>;

export interface ColumnsProps extends DivPrimitiveProps<ColumnsState> {
    /** called per day of the time grid (`<Calendar.Column column={column}>`) */
    children: (column: TimeGridColumn) => React.ReactNode;
}

/**
 * The layer of the time grid's columns (`role="row"`, the grid's last row: a `gridcell` per day
 * holding its timed events), laid over its slot rows (position it yourself: it sets no geometry
 * of its own). Presses go through it to the slots; its events take their own.
 */
export function Columns(props: ColumnsProps) {
    const render = props.children;
    const { children, ...rest } = props;
    const context = useCalendarContext("Columns");
    const part = usePart(context, "columns", {});
    const grid = useTimeGrid();
    return useRenderElement("div", rest, {
        state: {},
        ref: part.ref,
        props: {
            ...part.props,
            children: (grid?.columns ?? []).map((column) => (
                <React.Fragment key={column.date}>
                    <MemoCall render={render} args={[column]} />
                </React.Fragment>
            )),
        },
        style: { pointerEvents: "none" },
    });
}
