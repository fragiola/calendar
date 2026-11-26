import type { TimeSegment } from "@fragiola/calendar";
import { computed, provide } from "vue";
import { splitRef } from "../composables/internal";
import {
    type TimeEventState,
    useTimeEvent,
} from "../composables/use-time-event";
import { ColumnKey, EventKey, useRequired } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface TimeEventProps extends PrimitiveProps {
    /** the segment, from `Calendar.ColumnEvents`' slot */
    segment: TimeSegment;
}

export interface TimeEventSlots extends RenderSlot<TimeEventState> {
    /** the event's content (its title is model data: render it yourself), with its state */
    default?: SlotFunction<TimeEventState>;
}

/**
 * A timed occurrence's part in a column (`role="listitem"`, `data-event-id`, …): positioned from
 * its layout fractions as percentages of the column (`top`, `height`, `inset-inline-start`,
 * `width`), focusable, draggable with `dragAndDrop()`, resizable with `resize()`.
 */
export const TimeEvent: CalendarComponent<TimeEventProps, TimeEventSlots> =
    definePrimitive<TimeEventProps, TimeEventSlots>(
        "TimeEvent",
        ["segment", "as"],
        (props, { attrs, slots }) => {
            const column = useRequired(
                ColumnKey,
                "TimeEvent",
                "Calendar.Column",
            );
            const { state, props: own } = useTimeEvent(() => props.segment);
            provide(
                EventKey,
                computed(() => ({
                    occurrenceId: props.segment.occurrenceId,
                    date: column.value.column.date,
                    timeSegment: props.segment,
                })),
            );
            return () => {
                const { ref, style, props: elementProps } = splitRef(own.value);
                return renderElement({
                    tag: "div",
                    as: props.as,
                    attrs,
                    render: slots.render,
                    state: state.value,
                    props: elementProps,
                    ref,
                    style,
                    children: () => slots.default?.(state.value),
                });
            };
        },
    );
