import { h } from "vue";
import { useFeature, usePart } from "../composables/internal";
import { EventKey, useCalendarContext, useRequired } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface ResizeHandleState {
    /** the edge it moves */
    edge: "start" | "end";
}

export interface ResizeHandleProps extends PrimitiveProps {
    /** the edge it moves: the event's `start` or its `end` */
    edge: "start" | "end";
}

export interface ResizeHandleSlots extends RenderSlot<ResizeHandleState> {
    default?: SlotFunction<ResizeHandleState>;
}

/** The handle of an installed `resize()`. */
const ResizeHandleElement = definePrimitive<
    ResizeHandleProps,
    ResizeHandleSlots
>("ResizeHandleElement", ["edge", "as"], (props, { attrs, slots }) => {
    const context = useCalendarContext("ResizeHandle");
    const event = useRequired(
        EventKey,
        "ResizeHandle",
        "Calendar.Segment or Calendar.TimeEvent",
    );
    const part = usePart(context, "resize-handle", () => ({
        occurrenceId: event.value.occurrenceId,
        date: event.value.date,
        edge: props.edge,
    }));
    return () => {
        const state = { edge: props.edge };
        return renderElement({
            tag: "div",
            as: props.as,
            attrs,
            render: slots.render,
            state,
            props: part.props.value,
            ref: part.ref,
            children: () => slots.default?.(state),
        });
    };
});

/**
 * A handle that resizes its event from one edge (`resize()`), inside a `Calendar.Segment` or a
 * `Calendar.TimeEvent` (`data-edge`; place it at the edge yourself). Hidden from assistive
 * technology: the keyboard resizes a grabbed event with Shift + arrows.
 */
export const ResizeHandle: CalendarComponent<
    ResizeHandleProps,
    ResizeHandleSlots
> = definePrimitive<ResizeHandleProps, ResizeHandleSlots>(
    "ResizeHandle",
    ["edge", "as"],
    (props, { attrs, slots }) => {
        const context = useCalendarContext("ResizeHandle");
        const installed = useFeature(context, "resize", "ResizeHandle");
        return () =>
            installed
                ? h(
                      ResizeHandleElement,
                      { ...attrs, as: props.as, edge: props.edge },
                      slots,
                  )
                : null;
    },
);
