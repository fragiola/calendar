import type { DayCell } from "@fragiola/calendar";
import { useCalendarContext } from "../context";
import { flag, type PartHookResult, usePart } from "./internal";

/** What a day shows (`Calendar.Day`, `useDay`). */
export interface DayState {
    /** the day as the layout gives it (`date`, `today`, `outside`, `hiddenCount`, …) */
    day: DayCell;
    /** it holds the roving focus */
    focused: boolean;
    /** a selected range covers it (`selection()`) */
    selected: boolean;
    /** outside `validRange` */
    disabled: boolean;
    /** it has business hours (`constraints()`) */
    businessHours: boolean;
}

/**
 * A day of a day grid (a month's, the all-day row's): its state and the props of its element
 * (`role="gridcell"`, `data-date`, the roving tab stop, its registration with the engine).
 */
export function useDay(day: DayCell): PartHookResult<DayState> {
    const context = useCalendarContext("useDay");
    const { attributes, props, ref } = usePart(context, "day", {
        date: day.date,
    });
    return {
        state: {
            day,
            focused: flag(attributes, "focused"),
            selected: flag(attributes, "selected"),
            disabled: flag(attributes, "disabled"),
            businessHours: flag(attributes, "business-hours"),
        },
        props: { ...props, ref },
    };
}
