import type { SelectionRange } from "@fragiola/calendar";
import { type ComputedRef, computed } from "vue";
import { useCalendarValue } from "../composables/internal";
import { useCalendarContext } from "../context";

/** The selection of a calendar (`useSelection`, `selection()`). */
export interface CalendarSelection {
    /** the selected range (model state: `get("selected-range")`), `null` for none */
    readonly range: SelectionRange | null;
    /** the range a pointer or Shift + arrows is selecting, before it is set (`null`: none) */
    readonly preview: SelectionRange | null;
}

/** The selected range and the one being selected, a computed that follows both. */
export function useSelection(): ComputedRef<CalendarSelection> {
    const context = useCalendarContext("useSelection");
    const range = useCalendarValue(
        context,
        () => context.model.get("selected-range") ?? null,
    );
    const preview = useCalendarValue(
        context,
        () => context.engine.value?.get("selection-preview") ?? null,
    );
    return computed(() => ({ range: range.value, preview: preview.value }));
}
