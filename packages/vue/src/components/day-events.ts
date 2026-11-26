import type { Segment } from "@fragiola/calendar";
import { computed, h } from "vue";
import { useCalendarValue, usePart } from "../composables/internal";
import { LANE_SIZE } from "../composables/use-segment";
import { DayKey, useCalendarContext, useRequired } from "../context";
import { MemoCall, memoSlot, type ScopeNames } from "../utils/memo-call";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface DayEventsState {
    /** the segments that start in the day */
    segments: readonly Segment[];
}

export interface DayEventsProps extends PrimitiveProps {}

export interface DayEventsSlots extends RenderSlot<DayEventsState> {
    /** called per segment that starts in the day (`<Calendar.Segment :segment="segment" />`) */
    default?: SlotFunction<{ segment: Segment }>;
}

const NAMES: ScopeNames = ["segment"];

/**
 * A day's events (`role="list"`): the segments that start in it, in lane order. It is their
 * containing block (`position: relative`) and holds the row's lanes (`min-block-size`, the row's
 * `lanes` times `--calendar-lane-size`), so every day of a row is as tall. With
 * `dayMaxEvents: "auto"` the engine measures it: it holds no lanes then, give it the day's room
 * (`flex: 1`).
 */
export const DayEvents: CalendarComponent<DayEventsProps, DayEventsSlots> =
    definePrimitive<DayEventsProps, DayEventsSlots>(
        "DayEvents",
        ["as"],
        (props, { attrs, slots }) => {
            const context = useCalendarContext("DayEvents");
            const day = useRequired(DayKey, "DayEvents", "Calendar.Day");
            const part = usePart(context, "day-events", () => ({
                date: day.value.day.date,
            }));
            const auto = useCalendarValue(
                context,
                () => context.model.state.settings.dayMaxEvents === "auto",
            );
            const segments = computed(() => {
                const { week, column } = day.value;
                return week.segments.filter(
                    (segment) => segment.startColumn === column,
                );
            });
            const render = memoSlot(slots);
            return () =>
                renderElement({
                    tag: "div",
                    as: props.as,
                    attrs,
                    render: slots.render,
                    state: { segments: segments.value },
                    props: part.props.value,
                    ref: part.ref,
                    style: auto.value
                        ? { position: "relative" }
                        : {
                              position: "relative",
                              minBlockSize: `calc(${day.value.week.lanes} * ${LANE_SIZE})`,
                          },
                    children: () =>
                        segments.value.map((segment) =>
                            h(MemoCall, {
                                key: segment.occurrenceId,
                                render: render(),
                                names: NAMES,
                                a: segment,
                            }),
                        ),
                });
        },
    );
