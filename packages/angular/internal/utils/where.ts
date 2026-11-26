// Where a decoration is (React's `useWhere`): in a `[calendarColumn]` (a time grid's day), else in
// a `[calendarWeek]` or `[calendarAllDayRow]` (a day grid's row).
import { computed, inject, type Signal } from "@angular/core";
import { CALENDAR_COLUMN, CALENDAR_WEEK } from "./context";
import type { Where } from "./styles";

/** The column or the row the directive being created is in, as a signal. */
export function injectWhere(): Signal<Where> {
    const column = inject(CALENDAR_COLUMN, { optional: true });
    const week = inject(CALENDAR_WEEK, { optional: true });
    return computed(() => {
        const inColumn = column?.column();
        return {
            column: inColumn,
            week: inColumn ? undefined : week?.week(),
        };
    });
}
