import type { TimeSegment } from "@fragiola/calendar";
import { h } from "vue";
import { usePart } from "../composables/internal";
import { ColumnKey, useCalendarContext, useRequired } from "../context";
import { MemoCall, memoSlot, type ScopeNames } from "../utils/memo-call";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface ColumnEventsState {
    /** the column's timed segments */
    segments: readonly TimeSegment[];
}

export interface ColumnEventsProps extends PrimitiveProps {}

export interface ColumnEventsSlots extends RenderSlot<ColumnEventsState> {
    /** called per timed segment of the day (`<Calendar.TimeEvent :segment="segment" />`) */
    default?: SlotFunction<{ segment: TimeSegment }>;
}

const NAMES: ScopeNames = ["segment"];

/**
 * A day's timed events (`role="list"`), positioned in its column: Enter on a slot moves focus to
 * the events that start in it, Up and Down move between them.
 */
export const ColumnEvents: CalendarComponent<
    ColumnEventsProps,
    ColumnEventsSlots
> = definePrimitive<ColumnEventsProps, ColumnEventsSlots>(
    "ColumnEvents",
    ["as"],
    (props, { attrs, slots }) => {
        const context = useCalendarContext("ColumnEvents");
        const column = useRequired(
            ColumnKey,
            "ColumnEvents",
            "Calendar.Column",
        );
        const part = usePart(context, "column-events", () => ({
            date: column.value.column.date,
        }));
        const render = memoSlot(slots);
        return () => {
            const { segments } = column.value.column;
            return renderElement({
                tag: "div",
                as: props.as,
                attrs,
                render: slots.render,
                state: { segments },
                props: part.props.value,
                ref: part.ref,
                // the column's containing block, for its events' percentages
                style: { position: "absolute", inset: 0 },
                children: () =>
                    segments.map((segment) =>
                        h(MemoCall, {
                            key: segment.occurrenceId,
                            render: render(),
                            names: NAMES,
                            a: segment,
                        }),
                    ),
            });
        };
    },
);
