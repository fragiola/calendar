import type { NowPosition } from "@fragiola/calendar";
import type * as React from "react";
import { ColumnContext, useCalendarContext, useRequired } from "../context";
import { useFeature, usePart } from "../hooks/internal";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";
import { useNowPosition } from "./use-now-position";

export interface NowIndicatorState {
    /** where now is: today, the time, its fraction of the column */
    position: NowPosition;
}

export interface NowIndicatorProps
    extends DivPrimitiveProps<NowIndicatorState> {
    /** what it shows (a line, a dot): elements, or a function of its state */
    children?:
        | React.ReactNode
        | ((state: NowIndicatorState) => React.ReactNode);
}

/**
 * The current time in today's `Calendar.Column` (`nowIndicator()`): positioned at its fraction of
 * the column (`top`), moved by the engine's clock; rendered only in today's column and once the
 * engine runs. Hidden from assistive technology.
 */
export function NowIndicator(props: NowIndicatorProps) {
    const context = useCalendarContext("NowIndicator");
    const installed = useFeature(context, "now-indicator", "NowIndicator");
    const { column } = useRequired(
        ColumnContext,
        "NowIndicator",
        "Calendar.Column",
    );
    const position = useNowPosition();
    if (!installed || !position || position.date !== column.date) return null;
    return <NowIndicatorElement {...props} position={position} />;
}

function NowIndicatorElement(
    props: NowIndicatorProps & { position: NowPosition },
) {
    const { position, children, ...rest } = props;
    const context = useCalendarContext("NowIndicator");
    const part = usePart(context, "now-indicator", {});
    const state = { position };
    return useRenderElement("div", rest, {
        state,
        ref: part.ref,
        props: {
            ...part.props,
            children:
                typeof children === "function" ? children(state) : children,
        },
        style: { position: "absolute", top: `${position.top * 100}%` },
    });
}
