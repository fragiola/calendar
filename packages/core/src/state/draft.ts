// The working copy of a state while commands run (a batch runs several on one draft). Every write
// makes a new frozen object for what it changes and keeps every other one, so the committed state
// shares each event no command touched (`before === after` when nothing changed, D11's identity).
import type { CalendarEvent, CalendarInfo } from "../document/calendar-event";
import type { IdSource } from "../document/id-source";
import type { CalendarState } from "./calendar-state";

/** A state as the commands and the features write it: the core's, with the features' fields. */
export type DraftState = CalendarState & Readonly<Record<string, unknown>>;

const indexes = new WeakMap<readonly { id: string }[], Map<string, number>>();

/** Each entity's index in a list of them, by id (made once per list). */
export function indexOf(list: readonly { id: string }[]): Map<string, number> {
    let index = indexes.get(list);
    if (!index) {
        index = new Map(list.map((entity, at) => [entity.id, at]));
        indexes.set(list, index);
    }
    return index;
}

export class Draft {
    /** the state as the commands so far left it */
    state: DraftState;
    readonly ids: IdSource;
    /** the clock (D16): `today`, the default anchor */
    readonly now: () => number;

    constructor(state: DraftState, ids: IdSource, now: () => number) {
        this.state = state;
        this.ids = ids;
        this.now = now;
    }

    /** An event by its id. */
    event(id: string): CalendarEvent | undefined {
        const at = indexOf(this.state.events).get(id);
        return at === undefined ? undefined : this.state.events[at];
    }

    /** A calendar by its id. */
    calendar(id: string): CalendarInfo | undefined {
        const at = indexOf(this.state.calendars).get(id);
        return at === undefined ? undefined : this.state.calendars[at];
    }

    /** Replaces fields of the state (a feature's, the settings, the view). */
    set(patch: Readonly<Record<string, unknown>>): void {
        this.state = Object.freeze({ ...this.state, ...patch });
    }

    /** Puts `event` in the place of the event of its id, or appends it. */
    putEvent(event: CalendarEvent): void {
        const events = this.state.events;
        const at = indexOf(events).get(event.id);
        if (at !== undefined && events[at] === event) return;
        const next = [...events];
        if (at === undefined) next.push(event);
        else next[at] = event;
        this.set({ events: Object.freeze(next) });
    }

    /** Removes the events `remove` picks; returns their ids. */
    removeEvents(remove: (event: CalendarEvent) => boolean): string[] {
        const removed: string[] = [];
        const kept = this.state.events.filter((event) => {
            if (!remove(event)) return true;
            removed.push(event.id);
            return false;
        });
        if (removed.length > 0) this.set({ events: Object.freeze(kept) });
        return removed;
    }

    /** Puts `calendar` in the place of the calendar of its id, or appends it. */
    putCalendar(calendar: CalendarInfo): void {
        const calendars = this.state.calendars;
        const at = indexOf(calendars).get(calendar.id);
        const next = [...calendars];
        if (at === undefined) next.push(calendar);
        else next[at] = calendar;
        this.set({ calendars: Object.freeze(next) });
    }

    /** Removes the calendar of an id. */
    removeCalendar(id: string): void {
        this.set({
            calendars: Object.freeze(
                this.state.calendars.filter((calendar) => calendar.id !== id),
            ),
        });
    }

    /** A fresh event or calendar id. */
    newId(kind: "event" | "calendar"): string {
        const used =
            kind === "event"
                ? indexOf(this.state.events)
                : indexOf(this.state.calendars);
        return this.ids.next(kind, (id) => used.has(id));
    }
}
