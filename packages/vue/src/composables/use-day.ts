import type { DayCell } from "@fragiola/calendar";
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useCalendarContext } from "../context";
import { flag, type PartComposableResult, usePart } from "./internal";

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
 * (`role="gridcell"`, `data-date`, the roving tab stop, the template ref that registers it with
 * the engine). Call it in `setup`, with the day (a value, a ref or a getter).
 */
export function useDay(
    day: MaybeRefOrGetter<DayCell>,
): PartComposableResult<DayState> {
    const context = useCalendarContext("useDay");
    const { attributes, props, ref } = usePart(context, "day", () => ({
        date: toValue(day).date,
    }));
    const state = computed<DayState>(() => {
        const current = attributes.value;
        return {
            day: toValue(day),
            focused: flag(current, "focused"),
            selected: flag(current, "selected"),
            disabled: flag(current, "disabled"),
            businessHours: flag(current, "business-hours"),
        };
    });
    return { state, props: computed(() => ({ ...props.value, ref })) };
}
