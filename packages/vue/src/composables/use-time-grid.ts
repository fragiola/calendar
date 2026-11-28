import type { TimeGrid } from "@fragiola/calendar";
import type { ComputedRef } from "vue";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "./internal";

/** The time grid the calendar shows (week, day and `days` views; `null` otherwise), a computed. */
export function useTimeGrid(): ComputedRef<TimeGrid | null> {
    const context = useCalendarContext("useTimeGrid");
    return useCalendarValue(context, () => context.model.get("time-grid"), {
        part: "time-grid",
    });
}
