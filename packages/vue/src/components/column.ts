import type { TimeGridColumn } from "@fragiola/calendar";
import { computed, provide } from "vue";
import { flag, usePart } from "../composables/internal";
import { ColumnKey, useCalendarContext } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface ColumnState {
    /** the column as the time grid gives it (`date`, `today`, `segments`, …) */
    column: TimeGridColumn;
    /** a selected range covers the day (`selection()`) */
    selected: boolean;
}

export interface ColumnProps extends PrimitiveProps {
    /** the column, from `Calendar.Columns`' slot */
    column: TimeGridColumn;
}

export interface ColumnSlots extends RenderSlot<ColumnState> {
    /**
     * what is positioned in it: `Calendar.ColumnEvents`, and the features' `NowIndicator`,
     * `BusinessHours`, `Selection`, `DragPreview`
     */
    default?: SlotFunction<ColumnState>;
}

/**
 * A day's positioned layer over the slot rows (`role="gridcell"` of the columns' row, `data-date`,
 * `data-today`, …; outside the roving focus: the slots are). The engine hit-tests on it: give it
 * the day's full height. It is the containing block of its events (`position: relative`).
 */
export const Column: CalendarComponent<ColumnProps, ColumnSlots> =
    definePrimitive<ColumnProps, ColumnSlots>(
        "Column",
        ["column", "as"],
        (props, { attrs, slots }) => {
            const context = useCalendarContext("Column");
            const part = usePart(context, "column", () => ({
                date: props.column.date,
            }));
            provide(
                ColumnKey,
                computed(() => ({ column: props.column })),
            );
            const state = computed<ColumnState>(() => ({
                column: props.column,
                selected: flag(part.attributes.value, "selected"),
            }));
            return () =>
                renderElement({
                    tag: "div",
                    as: props.as,
                    attrs,
                    render: slots.render,
                    state: state.value,
                    props: part.props.value,
                    ref: part.ref,
                    style: { position: "relative" },
                    children: () => slots.default?.(state.value),
                });
        },
    );
