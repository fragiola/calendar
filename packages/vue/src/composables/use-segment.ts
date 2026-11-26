import type { Segment } from "@fragiola/calendar";
import {
    type CSSProperties,
    computed,
    type MaybeRefOrGetter,
    toValue,
} from "vue";
import { useCalendarContext, useRequired, WeekKey } from "../context";
import {
    type EventState,
    eventStateOf,
    type PartComposableResult,
    usePart,
} from "./internal";

/** What a day-grid segment shows (`Calendar.Segment`, `useSegment`). */
export interface SegmentState extends EventState {
    /** the segment as the layout gives it: `startColumn`, `span`, `lane` in its row */
    segment: Segment;
}

/** The height of a day-grid lane: the app's `--calendar-lane-size` (default `1.5rem`). */
export const LANE_SIZE = "var(--calendar-lane-size, 1.5rem)";

/** The space between two days' event areas in a row: the app's `--calendar-day-gap` (default 0). */
const DAY_GAP = "var(--calendar-day-gap, 0px)";

/**
 * The structural style of a day-grid segment (D18), in its day's `Calendar.DayEvents`: its lane
 * from the top (`lane` lanes of `--calendar-lane-size`), its width over `span` days (each day's
 * event area plus `--calendar-day-gap` between two), on logical properties.
 */
export function segmentStyle(segment: Segment): CSSProperties {
    return {
        position: "absolute",
        insetInlineStart: 0,
        insetBlockStart: `calc(${segment.lane} * ${LANE_SIZE})`,
        blockSize: LANE_SIZE,
        inlineSize:
            segment.span === 1
                ? "100%"
                : `calc(${segment.span} * 100% + ${segment.span - 1} * ${DAY_GAP})`,
    };
}

/**
 * An occurrence's part within a day-grid row (inside `Calendar.Week` or `Calendar.AllDayRow`):
 * its state and the props of its element (`role="listitem"`, its ids, the roving tab stop, the
 * template ref that registers it and its place in its day's events: `segmentStyle`).
 */
export function useSegment(
    segment: MaybeRefOrGetter<Segment>,
): PartComposableResult<SegmentState> {
    const context = useCalendarContext("useSegment");
    const week = useRequired(
        WeekKey,
        "useSegment",
        "Calendar.Week or Calendar.AllDayRow",
    );
    const { attributes, props, ref } = usePart(context, "event", () => {
        const current = toValue(segment);
        const row = week.value.week;
        return {
            occurrenceId: current.occurrenceId,
            date: row.days[current.startColumn]?.date ?? row.id,
            continuesBefore: current.continuesBefore,
            continuesAfter: current.continuesAfter,
        };
    });
    const state = computed<SegmentState>(() => ({
        ...eventStateOf(attributes.value),
        segment: toValue(segment),
    }));
    return {
        state,
        props: computed(() => ({
            ...props.value,
            ref,
            style: segmentStyle(toValue(segment)),
        })),
    };
}
