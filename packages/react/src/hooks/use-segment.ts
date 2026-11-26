import type { Segment } from "@fragiola/calendar";
import { useCalendarContext, useRequired, WeekContext } from "../context";
import {
    type EventState,
    eventStateOf,
    type PartHookResult,
    usePart,
} from "./internal";

/** What a day-grid segment shows (`Calendar.Segment`, `useSegment`). */
export interface SegmentState extends EventState {
    /** the segment as the layout gives it: `startColumn`, `span`, `lane` in its row */
    segment: Segment;
}

/**
 * An occurrence's part within a day-grid row (inside `Calendar.Week` or `Calendar.AllDayRow`):
 * its state and the props of its element (`role="listitem"`, its ids, the roving tab stop, its
 * registration). Place it in its row from `state.segment` (`startColumn`, `span`, `lane`).
 */
export function useSegment(segment: Segment): PartHookResult<SegmentState> {
    const context = useCalendarContext("useSegment");
    const { week } = useRequired(
        WeekContext,
        "useSegment",
        "Calendar.Week or Calendar.AllDayRow",
    );
    const date = week.days[segment.startColumn]?.date ?? week.id;
    const { attributes, props, ref } = usePart(context, "event", {
        occurrenceId: segment.occurrenceId,
        date,
        continuesBefore: segment.continuesBefore,
        continuesAfter: segment.continuesAfter,
    });
    return {
        state: { ...eventStateOf(attributes), segment },
        props: { ...props, ref },
    };
}
