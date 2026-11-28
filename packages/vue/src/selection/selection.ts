import type { Segment, TimeSegment } from "@fragiola/calendar";
import { computed, h } from "vue";
import {
    previewSegmentsIn,
    previewStyle,
    useCalendarValue,
    useFeature,
    usePart,
    useWhere,
    type Where,
} from "../composables/internal";
import { useCalendarContext } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface SelectionState {
    /** the highlight's part here: a time-grid segment (in a column) or a day-grid segment (in a row) */
    segment: TimeSegment | Segment;
    /** the range is still being selected (a pointer, Shift + arrows), not set yet */
    pending: boolean;
}

export interface SelectionProps extends PrimitiveProps {}

export interface SelectionSlots extends RenderSlot<SelectionState> {
    /** what it shows, with its state */
    default?: SlotFunction<SelectionState>;
}

/** One element of the highlight, where it is. */
const SelectionElement = definePrimitive<
    SelectionProps & {
        segment: TimeSegment | Segment;
        pending: boolean;
        where: Where;
    },
    SelectionSlots
>(
    "SelectionElement",
    ["segment", "pending", "where", "as"],
    (props, { attrs, slots }) => {
        const context = useCalendarContext("Selection");
        const part = usePart(context, "selection", () => ({}), false);
        return () => {
            const state: SelectionState = {
                segment: props.segment,
                pending: props.pending,
            };
            return renderElement({
                tag: "div",
                as: props.as,
                attrs,
                render: slots.render,
                state,
                props: part.props.value,
                ref: part.ref,
                style: previewStyle(props.segment, props.where),
                children: () => slots.default?.(state),
            });
        };
    },
    { booleans: ["pending"] },
);

/**
 * The highlight of the range selected (or being selected) with `selection()`, laid out as an
 * event: in a `Calendar.Column` it is positioned as a timed event; in a `Calendar.Week` or
 * `Calendar.AllDayRow` it renders the row's segment, over its days (the row is its containing
 * block; `--calendar-row-inset` is the row's space before its first day: a week number, a label).
 * Hidden from assistive technology (the days and slots carry `data-selected`).
 */
export const Selection: CalendarComponent<SelectionProps, SelectionSlots> =
    definePrimitive<SelectionProps, SelectionSlots>(
        "Selection",
        ["as"],
        (props, { attrs, slots }) => {
            const context = useCalendarContext("Selection");
            const installed = useFeature(context, "selection", "Selection");
            const where = useWhere();
            const shown = useCalendarValue(
                context,
                () => context.engine.value?.get("selection-segments") ?? null,
                { part: "selection" },
            );
            const pending = useCalendarValue(
                context,
                () =>
                    (context.engine.value?.get("selection-preview") ?? null) !==
                    null,
                { part: "selection" },
            );
            const segments = computed(() =>
                previewSegmentsIn(shown.value, where.value),
            );
            return () =>
                installed
                    ? segments.value.map((segment, index) =>
                          h(
                              SelectionElement,
                              {
                                  ...attrs,
                                  key: index,
                                  as: props.as,
                                  segment,
                                  pending: pending.value,
                                  where: where.value,
                              },
                              slots,
                          ),
                      )
                    : null;
        },
    );
