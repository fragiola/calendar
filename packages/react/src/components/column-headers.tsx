import * as React from "react";
import { useCalendarContext } from "../context";
import { useCalendarValue, usePart } from "../hooks/internal";
import { MemoCall } from "../utils/memo-call";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface ColumnHeadersState {
    /** the dates of the columns: a time grid's days, a month's first row (its weekdays) */
    dates: readonly string[];
}

export interface ColumnHeadersProps
    extends DivPrimitiveProps<ColumnHeadersState> {
    /**
     * called per column (`<Calendar.ColumnHeader date={date} />`); a time grid's axis is its
     * column 1 (`aria-colindex`), so no corner cell is needed
     */
    children: (date: string) => React.ReactNode;
}

/** The grid's header row (`role="row"`): a header per day (time grid) or weekday (month). */
export function ColumnHeaders(props: ColumnHeadersProps) {
    const render = props.children;
    const { children, ...rest } = props;
    const context = useCalendarContext("ColumnHeaders");
    const { model, engine } = context;
    const part = usePart(context, "column-headers", {});
    const columns = useCalendarValue(context, () => model.get("time-grid"), {
        part: "column-headers",
    });
    const grid = useCalendarValue(
        context,
        () => (engine ? engine.get("day-grid") : model.get("day-grid")),
        { part: "column-headers" },
    );
    const dates = React.useMemo(
        () =>
            columns
                ? columns.columns.map((column) => column.date)
                : (grid?.weeks[0]?.days ?? []).map((day) => day.date),
        [columns, grid],
    );
    return useRenderElement("div", rest, {
        state: { dates },
        ref: part.ref,
        props: {
            ...part.props,
            // keyed by position: the next range's headers reuse these elements (Epic #27)
            children: dates.map((date, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: a column is its position
                <MemoCall key={index} render={render} args={[date]} />
            )),
        },
    });
}
