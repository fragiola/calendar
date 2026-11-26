import { usePart } from "../composables/internal";
import { useCalendarContext } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export type TimeGridState = Record<never, never>;

export interface TimeGridProps extends PrimitiveProps {}

export interface TimeGridSlots extends RenderSlot<TimeGridState> {
    default?: SlotFunction<Record<never, never>>;
}

/**
 * A week's, a day's or a `days` view's grid (`role="grid"`): renders its default slot, in rows:
 * the `Calendar.ColumnHeaders`, the `Calendar.AllDayRow`, then the `Calendar.SlotRows` (usually in
 * a `Calendar.Scroller`) with the `Calendar.Columns` layer over them. One tab stop: the keys move
 * the roving focus over its all-day days and slots.
 */
export const TimeGrid: CalendarComponent<TimeGridProps, TimeGridSlots> =
    definePrimitive<TimeGridProps, TimeGridSlots>(
        "TimeGrid",
        ["as"],
        (props, { attrs, slots }) => {
            const context = useCalendarContext("TimeGrid");
            const part = usePart(context, "time-grid", () => ({}));
            return () =>
                renderElement({
                    tag: "div",
                    as: props.as,
                    attrs,
                    render: slots.render,
                    state: {},
                    props: part.props.value,
                    ref: part.ref,
                    children: () => slots.default?.({}),
                });
        },
    );
