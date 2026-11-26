import * as React from "react";
import { useCalendarContext } from "../context";
import { useCalendarValue, usePart } from "../hooks/internal";
import { MemoCall, useLatest } from "../utils/memo-call";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface ColumnHeadersState {
    /** the dates of the columns: a time grid's days, a month's first row (its weekdays) */
    dates: readonly string[];
}

export interface ColumnHeadersProps
    extends DivPrimitiveProps<ColumnHeadersState> {
    /**
     * called per column (`<Calendar.ColumnHeader date={date} />`); put a corner cell for a time
     * axis before it yourself
     */
    children: (date: string) => React.ReactNode;
}

/** The grid's header row (`role="row"`): a header per day (time grid) or weekday (month). */
export function ColumnHeaders(props: ColumnHeadersProps) {
    const render = useLatest(props.children);
    const { children, ...rest } = props;
    const context = useCalendarContext("ColumnHeaders");
    const { model, engine } = context;
    const part = usePart(context, "column-headers", {});
    const columns = useCalendarValue(context, () => model.get("time-grid"));
    const grid = useCalendarValue(context, () =>
        engine ? engine.get("day-grid") : model.get("day-grid"),
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
            children: dates.map((date) => (
                <MemoCall key={date} render={render} args={[date]} />
            )),
        },
    });
}
