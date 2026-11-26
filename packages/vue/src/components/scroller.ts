import { usePart } from "../composables/internal";
import { useCalendarContext } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export type ScrollerState = Record<never, never>;

export interface ScrollerProps extends PrimitiveProps {}

export interface ScrollerSlots extends RenderSlot<ScrollerState> {
    default?: SlotFunction<Record<never, never>>;
}

/**
 * The element that scrolls the time grid's slots (give it a height and `overflow: auto`): the
 * engine autoscrolls it while a gesture nears its edges.
 */
export const Scroller: CalendarComponent<ScrollerProps, ScrollerSlots> =
    definePrimitive<ScrollerProps, ScrollerSlots>(
        "Scroller",
        ["as"],
        (props, { attrs, slots }) => {
            const context = useCalendarContext("Scroller");
            const part = usePart(context, "scroller", () => ({}));
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
