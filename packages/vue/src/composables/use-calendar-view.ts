import type { DateRangeJson, ViewType } from "@fragiola/calendar";
import { type ComputedRef, computed } from "vue";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "./internal";

/** The view a calendar shows (`useCalendarView`). */
export interface CalendarView {
    readonly type: ViewType;
    /** the date the view is built around, `YYYY-MM-DD` */
    readonly anchorDate: string;
    /** `days` views: how many days */
    readonly days: number | undefined;
    /** the days shown (a month's six weeks), end exclusive */
    readonly visibleRange: DateRangeJson;
    /** the range the view is about (the month itself), end exclusive */
    readonly currentRange: DateRangeJson;
}

/** The view of the enclosing `Calendar.Root`, a computed that follows it. */
export function useCalendarView(): ComputedRef<CalendarView> {
    const context = useCalendarContext("useCalendarView");
    const { model } = context;
    const view = useCalendarValue(context, () => model.state.view, {
        part: "root",
    });
    const visibleRange = useCalendarValue(
        context,
        () => model.get("visible-range"),
        { part: "root" },
    );
    const currentRange = useCalendarValue(
        context,
        () => model.get("current-range"),
        { part: "root" },
    );
    return computed(() => ({
        type: view.value.type,
        anchorDate: view.value.anchorDate,
        days: view.value.days,
        visibleRange: visibleRange.value,
        currentRange: currentRange.value,
    }));
}
