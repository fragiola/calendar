import type { TimeGridColumn } from "@fragiola/calendar";
import { h } from "vue";
import { usePart } from "../composables/internal";
import { useTimeGrid } from "../composables/use-time-grid";
import { useCalendarContext } from "../context";
import { MemoCall, memoSlot, type ScopeNames } from "../utils/memo-call";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export type ColumnsState = Record<never, never>;

export interface ColumnsProps extends PrimitiveProps {}

export interface ColumnsSlots extends RenderSlot<ColumnsState> {
    /** called per day of the time grid (`<Calendar.Column :column="column">`) */
    default?: SlotFunction<{ column: TimeGridColumn }>;
}

const NAMES: ScopeNames = ["column"];

/**
 * The layer of the time grid's columns (`role="row"`, the grid's last row: a `gridcell` per day
 * holding its timed events), laid over its slot rows (position it yourself: it sets no geometry
 * of its own). Presses go through it to the slots; its events take their own.
 */
export const Columns: CalendarComponent<ColumnsProps, ColumnsSlots> =
    definePrimitive<ColumnsProps, ColumnsSlots>(
        "Columns",
        ["as"],
        (props, { attrs, slots }) => {
            const context = useCalendarContext("Columns");
            const part = usePart(context, "columns", () => ({}));
            const grid = useTimeGrid();
            const render = memoSlot(slots);
            return () =>
                renderElement({
                    tag: "div",
                    as: props.as,
                    attrs,
                    render: slots.render,
                    state: {},
                    props: part.props.value,
                    ref: part.ref,
                    style: { pointerEvents: "none" },
                    children: () =>
                        (grid.value?.columns ?? []).map((column) =>
                            h(MemoCall, {
                                key: column.date,
                                render: render(),
                                names: NAMES,
                                a: column,
                            }),
                        ),
                });
        },
    );
