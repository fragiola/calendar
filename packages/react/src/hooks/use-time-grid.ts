import type { TimeGrid } from "@fragiola/calendar";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "./internal";

/** The time grid the calendar shows (week, day and `days` views; `null` otherwise). */
export function useTimeGrid(): TimeGrid | null {
    const context = useCalendarContext("useTimeGrid");
    return useCalendarValue(context, () => context.model.get("time-grid"), {
        part: "time-grid",
    });
}
