import type { DayCell, DayGridWeek } from "@fragiola/calendar";
import { h } from "vue";
import { useRequired, WeekKey } from "../context";
import { MemoCall, memoSlot, type ScopeNames } from "../utils/memo-call";
import {
    type CalendarComponent,
    definePrimitive,
    type SlotFunction,
} from "../utils/primitive";

export type DaysProps = Record<never, never>;

export interface DaysSlots {
    /** called per day of the row (`<Calendar.Day :day="day">`) */
    default?: SlotFunction<{ day: DayCell; week: DayGridWeek }>;
}

const NAMES: ScopeNames = ["day", "week"];

/** The days of the enclosing row: calls its slot per day (it renders no element of its own). */
export const Days: CalendarComponent<DaysProps, DaysSlots> = definePrimitive<
    DaysProps,
    DaysSlots
>("Days", [], (_props, { slots }) => {
    const row = useRequired(
        WeekKey,
        "Days",
        "Calendar.Week or Calendar.AllDayRow",
    );
    const render = memoSlot(slots);
    return () => {
        const { week } = row.value;
        return week.days.map((day) =>
            h(MemoCall, {
                key: day.date,
                render: render(),
                names: NAMES,
                a: day,
                b: week,
            }),
        );
    };
});
