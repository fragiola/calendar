import type { ListDay as ListDayLayout, ListItem } from "@fragiola/calendar";
import { computed, h, provide } from "vue";
import { usePart } from "../composables/internal";
import { ListDayKey, useCalendarContext } from "../context";
import { MemoCall, memoSlot, type ScopeNames } from "../utils/memo-call";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface ListDayState {
    /** the day as the list layout gives it (`date`, `today`, `past`, `items`) */
    day: ListDayLayout;
    today: boolean;
}

export interface ListDayProps extends PrimitiveProps {
    /** the day, from `Calendar.ListDays`' slot */
    day: ListDayLayout;
}

export interface ListDaySlots extends RenderSlot<ListDayState> {
    /** called per occurrence of the day (`<Calendar.ListEvent :item="item" />`) */
    default?: SlotFunction<{ item: ListItem }>;
}

const NAMES: ScopeNames = ["item"];

/** A list view's day (`role="list"`, `data-date`): its events. Its heading is the app's, before it. */
export const ListDay: CalendarComponent<ListDayProps, ListDaySlots> =
    definePrimitive<ListDayProps, ListDaySlots>(
        "ListDay",
        ["day", "as"],
        (props, { attrs, slots }) => {
            const context = useCalendarContext("ListDay");
            const part = usePart(context, "list-day", () => ({
                date: props.day.date,
            }));
            provide(
                ListDayKey,
                computed(() => ({ day: props.day })),
            );
            const render = memoSlot(slots);
            return () =>
                renderElement({
                    tag: "div",
                    as: props.as,
                    attrs,
                    render: slots.render,
                    state: { day: props.day, today: props.day.today },
                    props: part.props.value,
                    ref: part.ref,
                    children: () =>
                        props.day.items.map((item) =>
                            h(MemoCall, {
                                key: item.occurrenceId,
                                render: render(),
                                names: NAMES,
                                a: item,
                            }),
                        ),
                });
        },
    );
