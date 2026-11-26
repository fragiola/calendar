// `@fragiola/calendar/selection`: the `selection()` feature (D2, D13). A range of days or of time
// is selected by a pointer drag over days or slots, or by Shift + arrows from the focused cell and
// Enter; `selection.set` / `selection.clear` and `get("selected-range")` hold it as model state
// (not document), `data-selected` marks its days and slots, and the engine tells the app (`select`,
// with the range and `allDay`). Drag-to-create is a selection plus the app's `event.add`. With
// `constraints()`, `selectConstraint` refuses a range (`model.can` answers the same).
import { defineFeature } from "../features/define-feature";
import type { CalendarFeature } from "../features/types";
import { selectionClear, selectionSet } from "./commands/selection-commands";
import { selectionEngine } from "./engine/selection-engine";
import {
    coversDay,
    coversSlot,
    type SelectionSlice,
    selectionOf,
} from "./state/selection-range";

export type { SelectionRange } from "../features/types";
export type { SelectionSlice } from "./state/selection-range";

/** Options of {@link selection}. */
export interface SelectionOptions {
    /**
     * the pixels a mouse or pen press moves before it selects (FullCalendar's
     * `selectMinDistance`); default 0: a click selects its day or slot
     */
    selectMinDistance?: number | undefined;
}

/** The selection feature, as `createCalendarModel`'s `features` takes it. */
export type SelectionFeature = CalendarFeature<"selection", SelectionSlice>;

const on = (yes: boolean) => (yes ? "" : undefined);

/** Selecting ranges of days or time, by pointer and keyboard. */
export function selection(options: SelectionOptions = {}): SelectionFeature {
    const minDistance = Math.max(options.selectMinDistance ?? 0, 0);
    return defineFeature<"selection", SelectionSlice>({
        name: "selection",
        commands: [selectionSet, selectionClear],
        get: { "selected-range": (state) => selectionOf(state) },
        load: () => ({ selection: null }),
        dayAttributes: (state, date) => {
            const range = selectionOf(state);
            return range
                ? { "data-selected": on(coversDay(range, date)) }
                : undefined;
        },
        slotAttributes: (state, date, time) => {
            const range = selectionOf(state);
            return range
                ? {
                      "data-selected": on(
                          coversSlot(
                              range,
                              date,
                              time,
                              state.settings.timeZone,
                          ),
                      ),
                  }
                : undefined;
        },
        engine: (host) => selectionEngine(host, minDistance),
    });
}
