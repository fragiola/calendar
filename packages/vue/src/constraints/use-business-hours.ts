import type { BusinessHoursRange } from "@fragiola/calendar";
import { type ComputedRef, type MaybeRefOrGetter, toValue } from "vue";
import { useCalendarValue } from "../composables/internal";
import { useCalendarContext } from "../context";

/**
 * The business hours of the visible days (`constraints()`, `get("business-hours-in")`), a
 * computed: each day's as instants and time-grid fractions; only `date`'s when given.
 */
export function useBusinessHours(
    date?: MaybeRefOrGetter<string | undefined>,
): ComputedRef<readonly BusinessHoursRange[]> {
    const context = useCalendarContext("useBusinessHours");
    const all = useCalendarValue(
        context,
        () => context.model.get("business-hours-in") ?? [],
        { part: "business-hours" },
    );
    return useCalendarValue(
        context,
        () => {
            const day = toValue(date);
            return day === undefined
                ? all.value
                : all.value.filter((range) => range.date === day);
        },
        { part: "business-hours" },
    );
}
