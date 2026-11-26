import type { ViewType } from "../document/calendar-document";
import type {
    CalendarEventOf,
    CalendarInfoOf,
} from "../document/calendar-event";
import type { CalendarSettings } from "../document/calendar-settings";
import type { AnyTypes, CalendarTypes } from "../document/calendar-types";

/**
 * The view (D7): model state, not document, so an AI or a server navigates without a screen. Its
 * ranges are derived (`get("visible-range")`, `get("current-range")`).
 */
export interface ViewState {
    readonly type: ViewType;
    /** the date the view is built around (`YYYY-MM-DD`) */
    readonly anchorDate: string;
    /** `days` views: how many (non-hidden) days, 1–14 */
    readonly days?: number;
    /** `list` views: how many days; without it, the anchor's month */
    readonly duration?: number;
}

/**
 * The state of a calendar: plain, frozen, JSON-shaped data. A command produces a new state that
 * shares every event it did not touch; `before === after` means nothing changed. An installed
 * feature adds its own fields.
 */
export interface CalendarState<T extends CalendarTypes = AnyTypes> {
    /** the events, in document order */
    readonly events: readonly CalendarEventOf<T>[];
    /** the calendars (categories), in document order */
    readonly calendars: readonly CalendarInfoOf<T>[];
    readonly settings: CalendarSettings;
    readonly view: ViewState;
}
