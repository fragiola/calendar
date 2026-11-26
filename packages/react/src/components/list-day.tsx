import type { ListDay as ListDayLayout, ListItem } from "@fragiola/calendar";
import * as React from "react";
import { ListDayContext, useCalendarContext } from "../context";
import { usePart } from "../hooks/internal";
import { MemoCall } from "../utils/memo-call";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface ListDayState {
    /** the day as the list layout gives it (`date`, `today`, `past`, `items`) */
    day: ListDayLayout;
    today: boolean;
}

export interface ListDayProps extends DivPrimitiveProps<ListDayState> {
    /** the day, from `Calendar.ListDays`' children function */
    day: ListDayLayout;
    /** called per occurrence of the day (`<Calendar.ListEvent item={item} />`) */
    children: (item: ListItem) => React.ReactNode;
}

/** A list view's day (`role="list"`, `data-date`): its events. Its heading is the app's, before it. */
export function ListDay(props: ListDayProps) {
    const render = props.children;
    const { day, children, ...rest } = props;
    const context = useCalendarContext("ListDay");
    const part = usePart(context, "list-day", { date: day.date });
    const value = React.useMemo(() => ({ day }), [day]);
    const element = useRenderElement("div", rest, {
        state: { day, today: day.today },
        ref: part.ref,
        props: {
            ...part.props,
            children: day.items.map((item) => (
                <React.Fragment key={item.occurrenceId}>
                    <MemoCall render={render} args={[item]} />
                </React.Fragment>
            )),
        },
    });
    return (
        <ListDayContext.Provider value={value}>
            {element}
        </ListDayContext.Provider>
    );
}
