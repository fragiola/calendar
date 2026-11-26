import type { Signal } from "@angular/core";
import type { SelectionRange } from "@fragiola/calendar";
import {
    calendarValue,
    injectCalendarContext,
} from "@fragiola/calendar-angular/internal";

/** The selection of a calendar (`injectSelection`, `selection()`). */
export interface CalendarSelection {
    /** the selected range (model state: `get("selected-range")`), `null` for none */
    readonly range: SelectionRange | null;
    /** the range a pointer or Shift + arrows is selecting, before it is set (`null`: none) */
    readonly preview: SelectionRange | null;
}

/** The selected range and the one being selected, as a signal that changes with either. */
export function injectSelection(): Signal<CalendarSelection> {
    const context = injectCalendarContext("injectSelection");
    return calendarValue(context, () => ({
        range: context.model().get("selected-range") ?? null,
        preview: context.engine()?.get("selection-preview") ?? null,
    }));
}
