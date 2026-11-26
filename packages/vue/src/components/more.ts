import { computed, h } from "vue";
import { usePart } from "../composables/internal";
import { DayKey, useCalendarContext, useRequired } from "../context";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface MoreState {
    /** how many occurrences of the day do not fit */
    hiddenCount: number;
    /** their ids, for the app's popover */
    hiddenOccurrenceIds: readonly string[];
    /** the day, `YYYY-MM-DD` */
    date: string;
}

export interface MoreProps extends PrimitiveProps {}

export interface MoreSlots extends RenderSlot<MoreState> {
    /** what it shows, with its state (`v-slot="{ hiddenCount }"`) */
    default?: SlotFunction<MoreState>;
}

/** The trigger once some of the day's occurrences are hidden. */
const MoreElement = definePrimitive<MoreProps, MoreSlots>(
    "MoreElement",
    ["as"],
    (props, { attrs, slots }) => {
        const context = useCalendarContext("More");
        const day = useRequired(DayKey, "More", "Calendar.Day");
        const part = usePart(context, "more", () => ({
            date: day.value.day.date,
        }));
        const state = computed<MoreState>(() => ({
            hiddenCount: day.value.day.hiddenCount,
            hiddenOccurrenceIds: day.value.day.hiddenOccurrenceIds,
            date: day.value.day.date,
        }));
        return () =>
            renderElement({
                tag: "button",
                as: props.as,
                attrs,
                render: slots.render,
                state: state.value,
                props: {
                    type: "button",
                    // outside the grid's roving focus: it is the last item of the day's events
                    // (Down from the last one, or Enter on a day whose events are all hidden)
                    tabindex: "-1",
                    ...part.props.value,
                },
                ref: part.ref,
                children: () => slots.default?.(state.value),
            });
    },
);

/**
 * A day's "+N more" trigger (a `button`), rendered only while some of the day's occurrences do not
 * fit (`dayMaxEvents`). A press, or Enter, is the engine's `more-click` (`@more-click`): the
 * popover is the app's. On the keyboard it is the last item of the day's events: Down from the last
 * one reaches it, Up goes back, Escape returns to the day.
 */
export const More: CalendarComponent<MoreProps, MoreSlots> = definePrimitive<
    MoreProps,
    MoreSlots
>("More", ["as"], (props, { attrs, slots }) => {
    const day = useRequired(DayKey, "More", "Calendar.Day");
    return () =>
        day.value.day.hiddenCount === 0
            ? null
            : h(MoreElement, { ...attrs, as: props.as }, slots);
});
