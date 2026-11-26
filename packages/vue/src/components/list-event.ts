import type { ListItem } from "@fragiola/calendar";
import { computed, provide } from "vue";
import { splitRef } from "../composables/internal";
import {
    type ListEventState,
    useListEvent,
} from "../composables/use-list-event";
import { EventKey, ListDayKey, useRequired } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface ListEventProps extends PrimitiveProps {
    /** the occurrence, from `Calendar.ListDay`'s slot */
    item: ListItem;
}

export interface ListEventSlots extends RenderSlot<ListEventState> {
    /** the event's content (its title is model data: render it yourself), with its state */
    default?: SlotFunction<ListEventState>;
}

/** An occurrence of a list view's day (`role="listitem"`, `data-event-id`, …): a tab stop of its own. */
export const ListEvent: CalendarComponent<ListEventProps, ListEventSlots> =
    definePrimitive<ListEventProps, ListEventSlots>(
        "ListEvent",
        ["item", "as"],
        (props, { attrs, slots }) => {
            const day = useRequired(
                ListDayKey,
                "ListEvent",
                "Calendar.ListDay",
            );
            const { state, props: own } = useListEvent(() => props.item);
            provide(
                EventKey,
                computed(() => ({
                    occurrenceId: props.item.occurrenceId,
                    date: day.value.day.date,
                })),
            );
            return () => {
                const { ref, props: elementProps } = splitRef(own.value);
                return renderElement({
                    tag: "div",
                    as: props.as,
                    attrs,
                    render: slots.render,
                    state: state.value,
                    props: elementProps,
                    ref,
                    children: () => slots.default?.(state.value),
                });
            };
        },
    );
