import type { DayCell, DayGridWeek } from "@fragiola/calendar";
import { computed, h, provide } from "vue";
import { usePart } from "../composables/internal";
import { useDayGrid } from "../composables/use-day-grid";
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

export interface AllDayRowState {
    /** the all-day row as the day grid gives it */
    week: DayGridWeek;
}

export interface AllDayRowProps extends PrimitiveProps {}

export interface AllDayRowSlots extends RenderSlot<AllDayRowState> {
    /** what the row holds (a corner cell, then `Calendar.Days`) */
    default?: SlotFunction<AllDayRowState>;
    /** called per day instead (`#day="{ day }"`: `<Calendar.Day :day="day" />`) */
    day?: SlotFunction<{ day: DayCell; week: DayGridWeek }>;
}

/** The row an `AllDayRow` renders, once the day grid has one. */
const AllDayRowElement = definePrimitive<
    AllDayRowProps & { week: DayGridWeek },
    AllDayRowSlots
>("AllDayRowElement", ["week", "as"], (props, { attrs, slots }) => {
    const context = useCalendarContext("AllDayRow");
    const part = usePart(context, "all-day-row", () => ({
        weekId: props.week.id,
    }));
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

/**
 * The time grid's all-day row (`role="row"`), its first row after the headers: the all-day and
 * multi-day events as day-grid segments, in `Calendar.Day`s. Up from the first slot reaches it.
 */
export const AllDayRow: CalendarComponent<AllDayRowProps, AllDayRowSlots> =
    definePrimitive<AllDayRowProps, AllDayRowSlots>(
        "AllDayRow",
        ["as"],
        (props, { attrs, slots }) => {
            const grid = useDayGrid();
            return () => {
                const week = grid.value?.weeks[0];
                if (!week) return null;
                return h(
                    AllDayRowElement,
                    { ...attrs, as: props.as, week },
                    passSlots(slots),
                );
            };
        },
    );
