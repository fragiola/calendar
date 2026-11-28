import type { DayGrid } from "@fragiola/calendar";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "./internal";

/**
 * The day grid the calendar shows (a month, or a time grid's all-day row), with the lane limit the
 * engine measured for `dayMaxEvents: "auto"`; `null` in a list view. Rows keep their identity while
 * they do not change.
 */
export function useDayGrid(): DayGrid | null {
    const context = useCalendarContext("useDayGrid");
    const { model, engine } = context;
    return useCalendarValue(
        context,
        () => (engine ? engine.get("day-grid") : model.get("day-grid")),
        { part: "day-grid" },
    );
}
