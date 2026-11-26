import type { NowPosition } from "@fragiola/calendar";
import { h } from "vue";
import { useFeature, usePart } from "../composables/internal";
import { ColumnKey, useCalendarContext, useRequired } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";
import { useNowPosition } from "./use-now-position";

export interface NowIndicatorState {
    /** where now is: today, the time, its fraction of the column */
    position: NowPosition;
}

export interface NowIndicatorProps extends PrimitiveProps {}

export interface NowIndicatorSlots extends RenderSlot<NowIndicatorState> {
    /** what it shows (a line, a dot), with its state */
    default?: SlotFunction<NowIndicatorState>;
}

/** The indicator once now is in its column. */
const NowIndicatorElement = definePrimitive<
    NowIndicatorProps & { position: NowPosition },
    NowIndicatorSlots
>("NowIndicatorElement", ["position", "as"], (props, { attrs, slots }) => {
    const context = useCalendarContext("NowIndicator");
    const part = usePart(context, "now-indicator", () => ({}));
    return () => {
        const state = { position: props.position };
        return renderElement({
            tag: "div",
            as: props.as,
            attrs,
            render: slots.render,
            state,
            props: part.props.value,
            ref: part.ref,
            style: {
                position: "absolute",
                top: `${props.position.top * 100}%`,
            },
            children: () => slots.default?.(state),
        });
    };
});

/**
 * The current time in today's `Calendar.Column` (`nowIndicator()`): positioned at its fraction of
 * the column (`top`), moved by the engine's clock; rendered only in today's column and once the
 * engine runs. Hidden from assistive technology.
 */
export const NowIndicator: CalendarComponent<
    NowIndicatorProps,
    NowIndicatorSlots
> = definePrimitive<NowIndicatorProps, NowIndicatorSlots>(
    "NowIndicator",
    ["as"],
    (props, { attrs, slots }) => {
        const context = useCalendarContext("NowIndicator");
        const installed = useFeature(context, "now-indicator", "NowIndicator");
        const column = useRequired(
            ColumnKey,
            "NowIndicator",
            "Calendar.Column",
        );
        const position = useNowPosition();
        return () => {
            const now = position.value;
            if (!installed || !now || now.date !== column.value.column.date) {
                return null;
            }
            return h(
                NowIndicatorElement,
                { ...attrs, as: props.as, position: now },
                slots,
            );
        };
    },
);
