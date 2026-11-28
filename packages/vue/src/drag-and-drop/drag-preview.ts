import type {
    DragPreview as Preview,
    Segment,
    TimeSegment,
} from "@fragiola/calendar";
import { h } from "vue";
import {
    previewSegmentsIn,
    previewStyle,
    useCalendarValue,
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
import { previewOf } from "./use-drag-preview";

export interface DragPreviewState {
    /** the moved, resized or dropped-in occurrence where it would land: its times */
    preview: Preview;
    /** its part here: a time-grid segment (in a column) or a day-grid segment (in a row) */
    segment: TimeSegment | Segment;
}

export interface DragPreviewProps extends PrimitiveProps {}

export interface DragPreviewSlots extends RenderSlot<DragPreviewState> {
    /** what it shows (the event's look, its new times), with its state */
    default?: SlotFunction<DragPreviewState>;
}

/** One element of the preview, where it is. */
const DragPreviewElement = definePrimitive<
    DragPreviewProps & {
        preview: Preview;
        segment: TimeSegment | Segment;
        where: Where;
    },
    DragPreviewSlots
>(
    "DragPreviewElement",
    ["preview", "segment", "where", "as"],
    (props, { attrs, slots }) => {
        const context = useCalendarContext("DragPreview");
        const part = usePart(context, "drag-preview", () => ({}), false);
        return () => {
            const state: DragPreviewState = {
                preview: props.preview,
                segment: props.segment,
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
);

/**
 * Where a drag (`dragAndDrop()`, `externalDrop()`) or a resize (`resize()`) would put the
 * occurrence, laid out as the event: in a `Calendar.Column` it is positioned as a timed event; in
 * a `Calendar.Week` or `Calendar.AllDayRow` it renders the row's segment, over its days (the row
 * is its containing block; `--calendar-row-inset` is the row's space before its first day: a week
 * number, a label). Rendered only while there is a target; hidden from assistive technology
 * (`@announce` tells).
 */
export const DragPreview: CalendarComponent<
    DragPreviewProps,
    DragPreviewSlots
> = definePrimitive<DragPreviewProps, DragPreviewSlots>(
    "DragPreview",
    ["as"],
    (props, { attrs, slots }) => {
        const context = useCalendarContext("DragPreview");
        const where = useWhere();
        // the preview where this one is: a move elsewhere keeps it null (no render here)
        const shown = useCalendarValue(
            context,
            () => {
                const preview = previewOf(context.engine.value);
                const segments = previewSegmentsIn(preview, where.value);
                return preview && segments.length > 0
                    ? { preview, segments }
                    : null;
            },
            { part: "drag-preview" },
        );
        return () => {
            if (!shown.value) return null;
            const { preview: current, segments } = shown.value;
            return segments.map((segment, index) =>
                h(
                    DragPreviewElement,
                    {
                        ...attrs,
                        key: index,
                        as: props.as,
                        preview: current,
                        segment,
                        where: where.value,
                    },
                    slots,
                ),
            );
        };
    },
);
