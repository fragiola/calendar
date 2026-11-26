// `@fragiola/calendar/constraints`: the `constraints()` feature. Settings that refuse commands:
// `businessHours` (per weekday, in the display zone), `eventConstraint` (`"business-hours"` or
// ranges) for `event.add`, `event.move`, `event.resize` and `event.update`'s times,
// `selectConstraint` (for `selection()`, through the `checkSelection` contribution point), and
// `overlap` (`false`, or per calendar). `model.can` / `check` answer the same (D9), so a drag's
// preview hides on a refused target; `get("business-hours-in")` and `data-business-hours` on days
// and slots are the business-hours fill.
import { defineFeature } from "../features/define-feature";
import type { CalendarFeature, FeatureState } from "../features/types";
import { toEpochDay } from "../time/epoch-day";
import { parsePlainDate } from "../time/parse-plain-date";
import { weekdayOf } from "../view/view-days";
import { businessHoursIn } from "./ranges/business-hours-in";
import { minutesOf } from "./ranges/spans";
import { checkConstraints, checkSelection } from "./rules/check-constraints";
import { constraintIssues } from "./rules/constraint-issues";

export type {
    BusinessHours,
    ConstraintRange,
    EventConstraint,
} from "../document/calendar-document";
export type { SelectionRange } from "../features/types";
export type { BusinessHoursRange } from "../state/feature-queries";

/** The constraints feature, as `createCalendarModel`'s `features` takes it. */
export type ConstraintsFeature = CalendarFeature<"constraints">;

/** The business-hours rules of a weekday that hold a time (minutes), or all of the day's. */
function hasBusinessHours(
    state: FeatureState,
    date: string,
    minutes?: number,
): boolean {
    const parsed = parsePlainDate(date);
    if (!parsed.ok) return false;
    const weekday = weekdayOf(toEpochDay(parsed.value));
    return (state.settings.businessHours ?? []).some((rule) => {
        if (!rule.daysOfWeek.includes(weekday)) return false;
        if (minutes === undefined) return true;
        const start = minutesOf(rule.startTime) ?? 0;
        const end = minutesOf(rule.endTime) ?? 0;
        return start <= minutes && minutes < end;
    });
}

const on = (yes: boolean) => (yes ? "" : undefined);

/**
 * Business hours, allowed ranges and overlap rules that refuse edits (`refused`, naming the
 * setting): the settings `businessHours`, `eventConstraint`, `selectConstraint` and `overlap`.
 */
export function constraints(): ConstraintsFeature {
    return defineFeature({
        name: "constraints",
        get: {
            "business-hours-in": (
                state,
                payload: { range?: { start?: unknown; end?: unknown } },
            ) => businessHoursIn(state, payload.range),
        },
        settingsIssues: constraintIssues,
        checkEvent: checkConstraints,
        checkSelection,
        dayAttributes: (state, date) =>
            state.settings.businessHours === undefined
                ? undefined
                : { "data-business-hours": on(hasBusinessHours(state, date)) },
        slotAttributes: (state, date, time) =>
            state.settings.businessHours === undefined
                ? undefined
                : {
                      "data-business-hours": on(
                          hasBusinessHours(state, date, minutesOf(time) ?? -1),
                      ),
                  },
    });
}
