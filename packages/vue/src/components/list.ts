import { computed } from "vue";
import { useCalendarValue, usePart } from "../composables/internal";
import { useCalendarContext } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface ListState {
    /** no day of the range has an event (`is("list-empty")`) */
    empty: boolean;
}

export interface ListProps extends PrimitiveProps {}

export interface ListSlots extends RenderSlot<ListState> {
    /** `Calendar.ListDays` (and what the app shows when `empty`), with its state */
    default?: SlotFunction<ListState>;
}

/** A list view's container: its days, each a list under the heading the app renders. */
export const List: CalendarComponent<ListProps, ListSlots> = definePrimitive<
    ListProps,
    ListSlots
>("List", ["as"], (props, { attrs, slots }) => {
    const context = useCalendarContext("List");
    const part = usePart(context, "list", () => ({}));
    const empty = useCalendarValue(
        context,
        () => context.model.is("list-empty"),
        { part: "list" },
    );
    const state = computed(() => ({ empty: empty.value }));
    return () =>
        renderElement({
            tag: "div",
            as: props.as,
            attrs,
            render: slots.render,
            state: state.value,
            props: part.props.value,
            ref: part.ref,
            children: () => slots.default?.(state.value),
        });
});
