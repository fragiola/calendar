import { computed } from "vue";
import { flag, usePart } from "../composables/internal";
import { useCalendarContext } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface ColumnHeaderState {
    /** its day, `YYYY-MM-DD` (a month's header stands for its weekday) */
    date: string;
    today: boolean;
    weekend: boolean;
    past: boolean;
}

export interface ColumnHeaderProps extends PrimitiveProps {
    /** the day, from `Calendar.ColumnHeaders`' slot */
    date: string;
}

export interface ColumnHeaderSlots extends RenderSlot<ColumnHeaderState> {
    /** what it shows (`useDayHeader(date)` gives the parts), with its state */
    default?: SlotFunction<ColumnHeaderState>;
}

/** A column's header (`role="columnheader"`, `data-date`, `data-today`, …). */
export const ColumnHeader: CalendarComponent<
    ColumnHeaderProps,
    ColumnHeaderSlots
> = definePrimitive<ColumnHeaderProps, ColumnHeaderSlots>(
    "ColumnHeader",
    ["date", "as"],
    (props, { attrs, slots }) => {
        const context = useCalendarContext("ColumnHeader");
        const part = usePart(context, "column-header", () => ({
            date: props.date,
        }));
        const state = computed<ColumnHeaderState>(() => ({
            date: props.date,
            today: flag(part.attributes.value, "today"),
            weekend: flag(part.attributes.value, "weekend"),
            past: flag(part.attributes.value, "past"),
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
                children: () => slots.default?.(state.value),
            });
    },
);
