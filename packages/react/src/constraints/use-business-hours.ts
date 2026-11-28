import type { BusinessHoursRange } from "@fragiola/calendar";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "../hooks/internal";

/**
 * The business hours of the visible days (`constraints()`, `get("business-hours-in")`), each day's
 * as instants and time-grid fractions; only `date`'s when given.
 */
export function useBusinessHours(date?: string): readonly BusinessHoursRange[] {
    const context = useCalendarContext("useBusinessHours");
    const all = useCalendarValue(
        context,
        () => context.model.get("business-hours-in") ?? [],
        { part: "business-hours" },
    );
    return useCalendarValue(
        context,
        () =>
            date === undefined
                ? all
                : all.filter((range) => range.date === date),
        { part: "business-hours" },
    );
}
