import type { DayGrid } from "@fragiola/calendar";
import type { ComputedRef } from "vue";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "./internal";

/**
 * The day grid the calendar shows (a month, or a time grid's all-day row), a computed, with the
 * lane limit the engine measured for `dayMaxEvents: "auto"`; `null` in a list view. Rows keep
 * their identity while they do not change.
 */
export function useDayGrid(): ComputedRef<DayGrid | null> {
    const context = useCalendarContext("useDayGrid");
    const { model } = context;
    return useCalendarValue(context, () => {
        const engine = context.engine.value;
        return engine ? engine.get("day-grid") : model.get("day-grid");
    });
}
