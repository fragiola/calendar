import type { Signal } from "@angular/core";
import type { ListLayout } from "@fragiola/calendar";
import {
    calendarValue,
    injectCalendarContext,
} from "@fragiola/calendar-angular/internal";

/** The visible days with their occurrences, empty days left out (a list view's, D11). */
export function injectListLayout(): Signal<ListLayout> {
    const context = injectCalendarContext("injectListLayout");
    return calendarValue(context, () => context.model().get("list"));
}
