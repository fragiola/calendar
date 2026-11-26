import type { SelectionRange } from "@fragiola/calendar";
import { useCalendarContext } from "../context";
import { useCalendarValue } from "../hooks/internal";

/** The selection of a calendar (`useSelection`, `selection()`). */
export interface CalendarSelection {
    /** the selected range (model state: `get("selected-range")`), `null` for none */
    readonly range: SelectionRange | null;
    /** the range a pointer or Shift + arrows is selecting, before it is set (`null`: none) */
    readonly preview: SelectionRange | null;
}

/** The selected range and the one being selected, re-rendering when either changes. */
export function useSelection(): CalendarSelection {
    const context = useCalendarContext("useSelection");
    const { model, engine } = context;
    const range = useCalendarValue(
        context,
        () => model.get("selected-range") ?? null,
    );
    const preview = useCalendarValue(
        context,
        () => engine?.get("selection-preview") ?? null,
    );
    return { range, preview };
}
