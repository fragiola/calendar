import type * as React from "react";
import { useCalendarContext } from "../context";
import { usePart } from "../hooks/internal";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export type ScrollerState = Record<never, never>;

export interface ScrollerProps extends DivPrimitiveProps<ScrollerState> {
    children?: React.ReactNode;
}

/**
 * The element that scrolls the time grid's slots (give it a height and `overflow: auto`): the
 * engine autoscrolls it while a gesture nears its edges.
 */
export function Scroller(props: ScrollerProps) {
    const { children, ...rest } = props;
    const context = useCalendarContext("Scroller");
    const part = usePart(context, "scroller", {});
    return useRenderElement("div", rest, {
        state: {},
        ref: part.ref,
        props: { ...part.props, children },
    });
}
