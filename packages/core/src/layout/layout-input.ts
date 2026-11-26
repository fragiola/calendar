// What every layout reads, gathered once per state, clock day and display zone: the view's days,
// the occurrences over them (through `occurrencesOf`, the features' contribution point), each
// occurrence's days and wall-clock keys in the display zone, the order, today. Layouts are pure
// functions of it (D11), so a server render and the first render have them.
import type { CalendarEvent } from "../document/calendar-event";
import { eventTimes } from "../document/event-times";
import type { ComposedFeatures } from "../features/registry";
import type { FeatureState } from "../features/types";
import { weekInfo } from "../locale/week-info";
import type { CalendarState } from "../state/calendar-state";
import { indexOf } from "../state/draft";
import type { Weekday } from "../time/day-of-week";
import { fromEpochDay, toEpochDay } from "../time/epoch-day";
import { minutesOfDay } from "../time/minutes-of-day";
import { parsePlainTime } from "../time/parse-plain-time";
import { timedDayRange } from "../time/timed-day-range";
import { instantToWallClock } from "../time-zone/instant-to-wall-clock";
import { resolveTimeZone } from "../time-zone/resolve-time-zone";
import { offsetMilliseconds } from "../time-zone/time-zone-offset";
import { validDays } from "../view/valid-days";
import { type DayRange, type ViewDays, viewDays } from "../view/view-days";
import { compareBy, type Ordered, parseEventOrder } from "./event-order";
import { type Occurrence, occurrencesOf } from "./occurrence";

/** An occurrence placed in the display zone. */
export interface PlacedOccurrence extends Ordered {
    readonly occurrence: Occurrence;
    /** the days it shows on, `endDay` exclusive (`nextDayThreshold` applied to a timed one) */
    readonly startDay: number;
    readonly endDay: number;
    /** a timed one's instants (an all-day one's: 0) */
    readonly startInstant: number;
    readonly endInstant: number;
}

/** What the layouts read. */
export interface LayoutInput {
    readonly state: CalendarState;
    readonly timeZone: string;
    readonly today: number;
    readonly days: ViewDays;
    readonly valid: DayRange;
    readonly weekend: readonly Weekday[];
    /** the occurrences shown over the view's grid, in event order */
    readonly placed: readonly PlacedOccurrence[];
    /** the order of ties: `eventOrder`, then event order (a stable sort) */
    readonly compare: (a: Ordered, b: Ordered) => number;
}

const DAY = 86_400_000;

/** Places per occurrence object and zone/threshold key: the same occurrence is placed once. */
const placements = new WeakMap<Occurrence, Map<string, PlacedOccurrence>>();

function place(
    occurrence: Occurrence,
    event: CalendarEvent,
    timeZone: string,
    threshold: number,
): PlacedOccurrence | undefined {
    const key = `${timeZone} ${threshold}`;
    let byKey = placements.get(occurrence);
    const cached = byKey?.get(key);
    if (cached && cached.event === event) return cached;
    const times = eventTimes(occurrence);
    if (!times) return undefined;
    let placed: PlacedOccurrence;
    if (times.allDay) {
        placed = {
            occurrence,
            event,
            allDay: true,
            start: times.start * DAY,
            end: times.end * DAY,
            startDay: times.start,
            endDay: times.end,
            startInstant: 0,
            endInstant: 0,
        };
    } else {
        const range = timedDayRange(
            instantToWallClock(times.start, timeZone),
            instantToWallClock(times.end, timeZone),
            threshold,
        );
        placed = {
            occurrence,
            event,
            allDay: false,
            start: times.start + offsetMilliseconds(timeZone, times.start),
            end: times.end + offsetMilliseconds(timeZone, times.end),
            startDay: toEpochDay(range.start),
            endDay: toEpochDay(range.end),
            startInstant: times.start,
            endInstant: times.end,
        };
    }
    if (!byKey) {
        byKey = new Map();
        placements.set(occurrence, byKey);
    }
    byKey.set(key, placed);
    return placed;
}

/** The events a view shows: those of calendars not hidden. */
function shownEvents(state: CalendarState): readonly CalendarEvent[] {
    const hidden = state.calendars.filter(
        (calendar) => calendar.visible === false,
    );
    if (hidden.length === 0) return state.events;
    const ids = new Set(hidden.map((calendar) => calendar.id));
    return state.events.filter(
        (event) => event.calendarId === undefined || !ids.has(event.calendarId),
    );
}

/** Gathers what the layouts read from a state. */
export function layoutInput(
    state: CalendarState,
    features: ComposedFeatures,
    today: number,
): LayoutInput {
    const { settings } = state;
    const timeZone = resolveTimeZone(settings.timeZone);
    const days = viewDays(state.view, settings);
    const thresholdTime = parsePlainTime(settings.nextDayThreshold);
    const threshold = thresholdTime.ok ? minutesOfDay(thresholdTime.value) : 0;
    const within = {
        range: {
            start: fromEpochDay(days.grid.start),
            end: fromEpochDay(days.grid.end),
        },
        timeZone,
    };
    const contribute = features.occurrences;
    const occurrences = occurrencesOf(
        shownEvents(state),
        within,
        contribute &&
            ((event, at) => contribute(state as FeatureState, event, at)),
    );
    const events = indexOf(state.events);
    const placed: PlacedOccurrence[] = [];
    for (const occurrence of occurrences) {
        const at = events.get(occurrence.eventId);
        const event = at === undefined ? undefined : state.events[at];
        if (!event) continue;
        const one = place(occurrence, event, timeZone, threshold);
        if (
            one &&
            one.startDay < days.grid.end &&
            one.endDay > days.grid.start
        ) {
            placed.push(one);
        }
    }
    const order = parseEventOrder(settings.eventOrder);
    return {
        state,
        timeZone,
        today,
        days,
        valid: validDays(settings),
        weekend: weekInfo(settings.locale).weekend,
        placed,
        compare: compareBy(typeof order === "string" ? [] : order),
    };
}
