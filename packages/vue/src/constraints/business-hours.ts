import type { BusinessHoursRange } from "@fragiola/calendar";
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
import { useBusinessHours } from "./use-business-hours";

export interface BusinessHoursState {
    /** the range: its day, its instants and its fractions of the column */
    range: BusinessHoursRange;
}

export interface BusinessHoursProps extends PrimitiveProps {}

export interface BusinessHoursSlots extends RenderSlot<BusinessHoursState> {
    default?: SlotFunction<BusinessHoursState>;
}

/** One range's element. */
const BusinessHoursElement = definePrimitive<
    BusinessHoursProps & { range: BusinessHoursRange },
    BusinessHoursSlots
>("BusinessHoursElement", ["range", "as"], (props, { attrs, slots }) => {
    const context = useCalendarContext("BusinessHours");
    const part = usePart(
        context,
        "business-hours",
        () => ({ date: props.range.date }),
        false,
    );
    return () => {
        const state = { range: props.range };
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
                top: `${props.range.top * 100}%`,
                height: `${props.range.height * 100}%`,
            },
            children: () => slots.default?.(state),
        });
    };
});

/**
 * A day's business hours in its `Calendar.Column` (`constraints()`): one element per range,
 * positioned at its fractions of the column (`top`, `height`). Hidden from assistive technology;
 * the slots within them carry `data-business-hours`.
 */
export const BusinessHours: CalendarComponent<
    BusinessHoursProps,
    BusinessHoursSlots
> = definePrimitive<BusinessHoursProps, BusinessHoursSlots>(
    "BusinessHours",
    ["as"],
    (props, { attrs, slots }) => {
        const context = useCalendarContext("BusinessHours");
        const installed = useFeature(context, "constraints", "BusinessHours");
        const column = useRequired(
            ColumnKey,
            "BusinessHours",
            "Calendar.Column",
        );
        const ranges = useBusinessHours(() =>
            installed ? column.value.column.date : "",
        );
        return () =>
            installed
                ? ranges.value
                      .filter((range) => range.height > 0)
                      .map((range) =>
                          h(
                              BusinessHoursElement,
                              {
                                  ...attrs,
                                  key: range.start,
                                  as: props.as,
                                  range,
                              },
                              slots,
                          ),
                      )
                : null;
    },
);
