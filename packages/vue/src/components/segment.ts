import type { Segment as SegmentLayout } from "@fragiola/calendar";
import { computed, provide } from "vue";
import { splitRef } from "../composables/internal";
import { type SegmentState, useSegment } from "../composables/use-segment";
import { EventKey, useRequired, WeekKey } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface SegmentProps extends PrimitiveProps {
    /** the segment, from `Calendar.DayEvents`' slot */
    segment: SegmentLayout;
}

export interface SegmentSlots extends RenderSlot<SegmentState> {
    /** the event's content (its title is model data: render it yourself), with its state */
    default?: SlotFunction<SegmentState>;
}

/**
 * An occurrence's part in a day-grid row (`role="listitem"`, `data-event-id`, …): focusable,
 * draggable with `dragAndDrop()`. It places itself from the layout (structural style): in its
 * lane (`--calendar-lane-size` high, default `1.5rem`) and over its `span` days (each day's event
 * area, plus `--calendar-day-gap` between two), on logical properties.
 */
export const Segment: CalendarComponent<SegmentProps, SegmentSlots> =
    definePrimitive<SegmentProps, SegmentSlots>(
        "Segment",
        ["segment", "as"],
        (props, { attrs, slots }) => {
            const { state, props: own } = useSegment(() => props.segment);
            const row = useRequired(
                WeekKey,
                "Segment",
                "Calendar.Week or Calendar.AllDayRow",
            );
            provide(
                EventKey,
                computed(() => {
                    const { week } = row.value;
                    return {
                        occurrenceId: props.segment.occurrenceId,
                        date:
                            week.days[props.segment.startColumn]?.date ??
                            week.id,
                    };
                }),
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
