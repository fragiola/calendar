import type { BusinessHoursRange } from "@fragiola/calendar";
import type * as React from "react";
import { ColumnContext, useCalendarContext, useRequired } from "../context";
import { useFeature, usePart } from "../hooks/internal";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";
import { useBusinessHours } from "./use-business-hours";

export interface BusinessHoursState {
    /** the range: its day, its instants and its fractions of the column */
    range: BusinessHoursRange;
}

export interface BusinessHoursProps
    extends DivPrimitiveProps<BusinessHoursState> {
    children?:
        | React.ReactNode
        | ((state: BusinessHoursState) => React.ReactNode);
}

/**
 * A day's business hours in its `Calendar.Column` (`constraints()`): one element per range,
 * positioned at its fractions of the column (`top`, `height`). Hidden from assistive technology;
 * the slots within them carry `data-business-hours`.
 */
export function BusinessHours(props: BusinessHoursProps) {
    const context = useCalendarContext("BusinessHours");
    const installed = useFeature(context, "constraints", "BusinessHours");
    const { column } = useRequired(
        ColumnContext,
        "BusinessHours",
        "Calendar.Column",
    );
    const ranges = useBusinessHours(installed ? column.date : "");
    if (!installed) return null;
    return (
        <>
            {ranges
                .filter((range) => range.height > 0)
                .map((range) => (
                    <BusinessHoursElement
                        key={range.start}
                        {...props}
                        range={range}
                    />
                ))}
        </>
    );
}

function BusinessHoursElement(
    props: BusinessHoursProps & { range: BusinessHoursRange },
) {
    const { range, children, ...rest } = props;
    const context = useCalendarContext("BusinessHours");
    const part = usePart(
        context,
        "business-hours",
        { date: range.date },
        false,
    );
    const state = { range };
    return useRenderElement("div", rest, {
        state,
        ref: part.ref,
        props: {
            ...part.props,
            children:
                typeof children === "function" ? children(state) : children,
        },
        style: {
            position: "absolute",
            top: `${range.top * 100}%`,
            height: `${range.height * 100}%`,
        },
    });
}
