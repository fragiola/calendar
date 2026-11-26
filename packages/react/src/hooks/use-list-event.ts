import type { ListItem } from "@fragiola/calendar";
import { ListDayContext, useCalendarContext, useRequired } from "../context";
import {
    type EventState,
    eventStateOf,
    type PartHookResult,
    usePart,
} from "./internal";

/** What a list view's event shows (`Calendar.ListEvent`, `useListEvent`). */
export interface ListEventState extends EventState {
    /** the item as the list layout gives it */
    item: ListItem;
}

/**
 * An occurrence on a list view's day (inside `Calendar.ListDay`): its state and the props of its
 * element (`role="listitem"`, its ids, a tab stop of its own, its registration).
 */
export function useListEvent(item: ListItem): PartHookResult<ListEventState> {
    const context = useCalendarContext("useListEvent");
    const { day } = useRequired(
        ListDayContext,
        "useListEvent",
        "Calendar.ListDay",
    );
    const { attributes, props, ref } = usePart(context, "event", {
        occurrenceId: item.occurrenceId,
        date: day.date,
        continuesBefore: item.continuesBefore,
        continuesAfter: item.continuesAfter,
    });
    return {
        state: { ...eventStateOf(attributes), item },
        props: { ...props, ref },
    };
}
