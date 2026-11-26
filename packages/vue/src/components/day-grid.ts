import { usePart } from "../composables/internal";
import { useCalendarContext } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export type DayGridState = Record<never, never>;

export interface DayGridProps extends PrimitiveProps {}

export interface DayGridSlots extends RenderSlot<DayGridState> {
    default?: SlotFunction<Record<never, never>>;
}

/**
 * A month's grid (`role="grid"`): renders its default slot, the `Calendar.ColumnHeaders` row and
 * the `Calendar.Weeks`. One tab stop: the keys move the roving focus over its days.
 */
export const DayGrid: CalendarComponent<DayGridProps, DayGridSlots> =
    definePrimitive<DayGridProps, DayGridSlots>(
        "DayGrid",
        ["as"],
        (props, { attrs, slots }) => {
            const context = useCalendarContext("DayGrid");
            const part = usePart(context, "day-grid", () => ({}));
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
