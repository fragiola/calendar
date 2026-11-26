import type { Segment } from "@fragiola/calendar";
import * as React from "react";
import { DayContext, useCalendarContext, useRequired } from "../context";
import { useCalendarValue, usePart } from "../hooks/internal";
import { LANE_SIZE } from "../hooks/use-segment";
import { MemoCall } from "../utils/memo-call";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface DayEventsState {
    /** the segments that start in the day */
    segments: readonly Segment[];
}

export interface DayEventsProps extends DivPrimitiveProps<DayEventsState> {
    /** called per segment that starts in the day (`<Calendar.Segment segment={segment} />`) */
    children: (segment: Segment) => React.ReactNode;
}

/**
 * A day's events (`role="list"`): the segments that start in it, in lane order. It is their
 * containing block (`position: relative`) and holds the row's lanes (`min-block-size`, the row's
 * `lanes` times `--calendar-lane-size`), so every day of a row is as tall. With
 * `dayMaxEvents: "auto"` the engine measures it: it holds no lanes then, give it the day's room
 * (`flex: 1`).
 */
export function DayEvents(props: DayEventsProps) {
    const render = props.children;
    const { children, ...rest } = props;
    const context = useCalendarContext("DayEvents");
    const { day, column, week } = useRequired(
        DayContext,
        "DayEvents",
        "Calendar.Day",
    );
    const part = usePart(context, "day-events", { date: day.date });
    const auto = useCalendarValue(
        context,
        () => context.model.state.settings.dayMaxEvents === "auto",
    );
    const segments = React.useMemo(
        () => week.segments.filter((segment) => segment.startColumn === column),
        [week, column],
    );
    return useRenderElement("div", rest, {
        state: { segments },
        ref: part.ref,
        props: {
            ...part.props,
            children: segments.map((segment) => (
                <React.Fragment key={segment.occurrenceId}>
                    <MemoCall render={render} args={[segment]} />
                </React.Fragment>
            )),
        },
        style: auto
            ? { position: "relative" }
            : {
                  position: "relative",
                  minBlockSize: `calc(${week.lanes} * ${LANE_SIZE})`,
              },
    });
}
