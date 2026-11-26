import type * as React from "react";
import { DayContext, useCalendarContext, useRequired } from "../context";
import { usePart } from "../hooks/internal";
import {
    type ButtonPrimitiveProps,
    useRenderElement,
} from "../utils/use-render";

export interface MoreState {
    /** how many occurrences of the day do not fit */
    hiddenCount: number;
    /** their ids, for the app's popover */
    hiddenOccurrenceIds: readonly string[];
    /** the day, `YYYY-MM-DD` */
    date: string;
}

export interface MoreProps extends ButtonPrimitiveProps<MoreState> {
    /** what it shows: elements, or a function of its state (`(s) => \`+${s.hiddenCount}\``) */
    children?: React.ReactNode | ((state: MoreState) => React.ReactNode);
}

/**
 * A day's "+N more" trigger (a `button`), rendered only while some of the day's occurrences do not
 * fit (`dayMaxEvents`). A press, or Enter, is the engine's `more-click` (`onMoreClick`): the
 * popover is the app's. On the keyboard it is the last item of the day's events: Down from the last
 * one reaches it, Up goes back, Escape returns to the day.
 */
export function More(props: MoreProps) {
    const { day } = useRequired(DayContext, "More", "Calendar.Day");
    if (day.hiddenCount === 0) return null;
    return <MoreElement {...props} />;
}

function MoreElement(props: MoreProps) {
    const { children, ...rest } = props;
    const context = useCalendarContext("More");
    const { day } = useRequired(DayContext, "More", "Calendar.Day");
    const part = usePart(context, "more", { date: day.date });
    const state: MoreState = {
        hiddenCount: day.hiddenCount,
        hiddenOccurrenceIds: day.hiddenOccurrenceIds,
        date: day.date,
    };
    return useRenderElement("button", rest, {
        state,
        ref: part.ref,
        props: {
            type: "button",
            // outside the grid's roving focus: it is the last item of the day's events (Down from
            // the last one, or Enter on a day whose events are all hidden)
            tabIndex: -1,
            ...part.props,
            children:
                typeof children === "function" ? children(state) : children,
        },
    });
}
