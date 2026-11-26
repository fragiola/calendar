import type { TimeGridColumn } from "@fragiola/calendar";
import * as React from "react";
import { ColumnContext, useCalendarContext } from "../context";
import { flag, usePart } from "../hooks/internal";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface ColumnState {
    /** the column as the time grid gives it (`date`, `today`, `segments`, …) */
    column: TimeGridColumn;
    /** a selected range covers the day (`selection()`) */
    selected: boolean;
}

export interface ColumnProps extends DivPrimitiveProps<ColumnState> {
    /** the column, from `Calendar.Columns`' children function */
    column: TimeGridColumn;
    /**
     * what is positioned in it: `Calendar.ColumnEvents`, and the features' `NowIndicator`,
     * `BusinessHours`, `Selection`, `DragPreview`
     */
    children?: React.ReactNode;
}

/**
 * A day's positioned layer over the slot rows (`role="gridcell"` of the columns' row, `data-date`,
 * `data-today`, …; outside the roving focus: the slots are). The engine hit-tests on it: give it
 * the day's full height. It is the containing block of its events (`position: relative`).
 */
export function Column(props: ColumnProps) {
    const { column, children, ...rest } = props;
    const context = useCalendarContext("Column");
    const part = usePart(context, "column", { date: column.date });
    const value = React.useMemo(() => ({ column }), [column]);
    const element = useRenderElement("div", rest, {
        state: { column, selected: flag(part.attributes, "selected") },
        ref: part.ref,
        props: { ...part.props, children },
        style: { position: "relative" },
    });
    return (
        <ColumnContext.Provider value={value}>{element}</ColumnContext.Provider>
    );
}
