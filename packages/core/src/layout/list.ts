// The list layout (D11): the view's days that hold occurrences, each with its occurrences in
// `eventOrder` (all-day and timed alike, a multi-day one on each of its days); empty days are left
// out, and `is("list-empty")` says when none is left.
import { fromEpochDay } from "../time/epoch-day";
import { formatPlainDate } from "../time/format-plain-date";
import { isHidden } from "../view/view-days";
import type { LayoutInput } from "./layout-input";
import type { PartCache } from "./reuse";

/** An occurrence on a day of the list. */
export interface ListItem {
    readonly eventId: string;
    readonly occurrenceId: string;
    readonly allDay: boolean;
    /** it started on an earlier day */
    readonly continuesBefore: boolean;
    /** it ends on a later day */
    readonly continuesAfter: boolean;
}

/** A day of the list, with its occurrences. */
export interface ListDay {
    /** `YYYY-MM-DD` */
    readonly date: string;
    readonly today: boolean;
    readonly past: boolean;
    readonly items: readonly ListItem[];
}

/** The list of a view: its days with occurrences, in order. */
export interface ListLayout {
    readonly days: readonly ListDay[];
}

/** The list of the view's visible days (any view: a list view's, or an agenda of another). */
export function listLayout(
    input: LayoutInput,
    cache: PartCache<ListDay>,
): ListLayout {
    const { visible } = input.days;
    const { hiddenDays } = input.state.settings;
    const sorted = [...input.placed].sort(input.compare);
    const days: ListDay[] = [];
    for (let day = visible.start; day < visible.end; day++) {
        if (isHidden(day, hiddenDays)) continue;
        const items: ListItem[] = [];
        const sources: object[] = [];
        for (const placed of sorted) {
            if (placed.startDay > day || placed.endDay <= day) continue;
            sources.push(placed.event);
            items.push({
                eventId: placed.occurrence.eventId,
                occurrenceId: placed.occurrence.occurrenceId,
                allDay: placed.allDay,
                continuesBefore: placed.startDay < day,
                continuesAfter: placed.endDay > day + 1,
            });
        }
        if (items.length === 0) continue;
        const date = formatPlainDate(fromEpochDay(day));
        days.push(
            cache.keep(
                date,
                {
                    date,
                    today: day === input.today,
                    past: day < input.today,
                    items,
                },
                sources,
            ),
        );
    }
    cache.done();
    return Object.freeze({ days: Object.freeze(days) });
}
