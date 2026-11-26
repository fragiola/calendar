import type { DayCell, DayGridWeek } from "@fragiola/calendar";
import { computed, h, provide } from "vue";
import { usePart } from "../composables/internal";
import { useCalendarContext, WeekKey } from "../context";
import { passSlots } from "../utils/memo-call";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";
import { Days } from "./days";

export interface WeekState {
    week: DayGridWeek;
}

export interface WeekProps extends PrimitiveProps {
    /** the row, from `Calendar.Weeks`' slot */
    week: DayGridWeek;
}

export interface WeekSlots extends RenderSlot<WeekState> {
    /** what the row holds (a `Calendar.WeekNumber`, then `Calendar.Days`) */
    default?: SlotFunction<WeekState>;
    /**
     * called per day instead (`#day="{ day }"`: `<Calendar.Day :day="day" />`), as
     * `Calendar.Days` would
     */
    day?: SlotFunction<{ day: DayCell; week: DayGridWeek }>;
}

/** A row of a month (`role="row"`): its days, and a week number if the app renders one. */
export const Week: CalendarComponent<WeekProps, WeekSlots> = definePrimitive<
    WeekProps,
    WeekSlots
>("Week", ["week", "as"], (props, { attrs, slots }) => {
    const context = useCalendarContext("Week");
    const part = usePart(context, "week", () => ({ weekId: props.week.id }));
    provide(
        WeekKey,
        computed(() => ({ week: props.week })),
    );
    return () =>
        renderElement({
            tag: "div",
            as: props.as,
            attrs,
            render: slots.render,
            state: { week: props.week },
            props: part.props.value,
            ref: part.ref,
            // the containing block of its decorations (`Selection`, `DragPreview`)
            style: { position: "relative" },
            children: () =>
                slots.day
                    ? h(Days, null, passSlots(slots, "day"))
                    : slots.default?.({ week: props.week }),
        });
});
