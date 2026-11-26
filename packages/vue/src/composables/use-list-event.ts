import type { ListItem } from "@fragiola/calendar";
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { ListDayKey, useCalendarContext, useRequired } from "../context";
import {
    type EventState,
    eventStateOf,
    type PartComposableResult,
    usePart,
} from "./internal";

/** What a list view's event shows (`Calendar.ListEvent`, `useListEvent`). */
export interface ListEventState extends EventState {
    /** the item as the list layout gives it */
    item: ListItem;
}

/**
 * An occurrence on a list view's day (inside `Calendar.ListDay`): its state and the props of its
 * element (`role="listitem"`, its ids, a tab stop of its own, the template ref that registers it).
 */
export function useListEvent(
    item: MaybeRefOrGetter<ListItem>,
): PartComposableResult<ListEventState> {
    const context = useCalendarContext("useListEvent");
    const day = useRequired(ListDayKey, "useListEvent", "Calendar.ListDay");
    const { attributes, props, ref } = usePart(context, "event", () => {
        const current = toValue(item);
        return {
            occurrenceId: current.occurrenceId,
            date: day.value.day.date,
            continuesBefore: current.continuesBefore,
            continuesAfter: current.continuesAfter,
        };
    });
    const state = computed<ListEventState>(() => ({
        ...eventStateOf(attributes.value),
        item: toValue(item),
    }));
    return { state, props: computed(() => ({ ...props.value, ref })) };
}
