import type { TimeSegment } from "@fragiola/calendar";
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { ColumnKey, useCalendarContext, useRequired } from "../context";
import {
    type EventState,
    eventStateOf,
    type PartComposableResult,
    timeSegmentStyle,
    usePart,
} from "./internal";

/** What a timed event shows in a column (`Calendar.TimeEvent`, `useTimeEvent`). */
export interface TimeEventState extends EventState {
    /** the segment as the layout gives it: fractions of the column, its overlap columns */
    segment: TimeSegment;
}

/**
 * A timed occurrence's part within a time-grid column (inside `Calendar.Column`): its state and
 * the props of its element (`role="listitem"`, its ids, the roving tab stop, the template ref that
 * registers it and its position as percentages of the column).
 */
export function useTimeEvent(
    segment: MaybeRefOrGetter<TimeSegment>,
): PartComposableResult<TimeEventState> {
    const context = useCalendarContext("useTimeEvent");
    const column = useRequired(ColumnKey, "useTimeEvent", "Calendar.Column");
    const { attributes, props, ref } = usePart(context, "event", () => {
        const current = toValue(segment);
        return {
            occurrenceId: current.occurrenceId,
            date: column.value.column.date,
            continuesBefore: current.continuesBefore,
            continuesAfter: current.continuesAfter,
        };
    });
    const state = computed<TimeEventState>(() => ({
        ...eventStateOf(attributes.value),
        segment: toValue(segment),
    }));
    return {
        state,
        props: computed(() => ({
            ...props.value,
            ref,
            // the column layer lets presses through to its slots: an event takes its own
            style: {
                ...timeSegmentStyle(toValue(segment)),
                pointerEvents: "auto" as const,
            },
        })),
    };
}
