import { computed, h } from "vue";
import { useCalendarValue, usePart } from "../composables/internal";
import { useCalendarContext } from "../context";
import { MemoCall, memoSlot, type ScopeNames } from "../utils/memo-call";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface ColumnHeadersState {
    /** the dates of the columns: a time grid's days, a month's first row (its weekdays) */
    dates: readonly string[];
}

export interface ColumnHeadersProps extends PrimitiveProps {}

export interface ColumnHeadersSlots extends RenderSlot<ColumnHeadersState> {
    /**
     * called per column (`<Calendar.ColumnHeader :date="date" />`); a time grid's axis is its
     * column 1 (`aria-colindex`), so no corner cell is needed
     */
    default?: SlotFunction<{ date: string }>;
}

const NAMES: ScopeNames = ["date"];

/** The grid's header row (`role="row"`): a header per day (time grid) or weekday (month). */
export const ColumnHeaders: CalendarComponent<
    ColumnHeadersProps,
    ColumnHeadersSlots
> = definePrimitive<ColumnHeadersProps, ColumnHeadersSlots>(
    "ColumnHeaders",
    ["as"],
    (props, { attrs, slots }) => {
        const context = useCalendarContext("ColumnHeaders");
        const { model } = context;
        const part = usePart(context, "column-headers", () => ({}));
        const columns = useCalendarValue(context, () => model.get("time-grid"));
        const grid = useCalendarValue(context, () => {
            const engine = context.engine.value;
            return engine ? engine.get("day-grid") : model.get("day-grid");
        });
        const dates = computed(() =>
            columns.value
                ? columns.value.columns.map((column) => column.date)
                : (grid.value?.weeks[0]?.days ?? []).map((day) => day.date),
        );
        const render = memoSlot(slots);
        return () =>
            renderElement({
                tag: "div",
                as: props.as,
                attrs,
                render: slots.render,
                state: { dates: dates.value },
                props: part.props.value,
                ref: part.ref,
                children: () =>
                    dates.value.map((date) =>
                        h(MemoCall, {
                            key: date,
                            render: render(),
                            names: NAMES,
                            a: date,
                        }),
                    ),
            });
    },
);
