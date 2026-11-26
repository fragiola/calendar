// The calendar document, version 1 (D3): what `createCalendarModel` loads and
// `get("calendar-json")` writes, JSON-shaped. Its JSON Schema is `calendar-schema.ts`, tested equal
// to these types (`tests/types/schemas.ts`).
import type { Weekday } from "../time/day-of-week";
import type { DateTimeString } from "../time/offset-date-time";
import type { PlainDateString } from "../time/plain-date";
import type { PlainTimeString } from "../time/plain-time";
import type {
    AnyTypes,
    CalendarDataOf,
    CalendarTypes,
    DataField,
    EventDataOf,
    KindOf,
} from "./calendar-types";

/** The permission flags of an event; one left out takes its calendar's, then the settings' (D9). */
export interface EventFlags {
    /** whether the event can be changed at all (`event.update`, and the default of the others) */
    editable?: boolean;
    /** whether its start can move (`event.move`, `event.resize` of the start edge) */
    startEditable?: boolean;
    /** whether its duration can change (`event.resize` of the end edge) */
    durationEditable?: boolean;
    /** whether it can be removed (`event.remove`) */
    deletable?: boolean;
}

/**
 * An event's recurrence (the `recurrence()` feature, `@fragiola/calendar/recurrence`): a field of
 * the document's schema that only a model with the feature loads (D3, D15).
 */
export interface RecurrenceJson {
    /** an RFC 5545 RRULE subset (`FREQ=WEEKLY;BYDAY=MO,WE`) */
    rule: string;
    /** the original starts of the occurrences left out */
    exdates?: string[];
    /** the occurrences changed one by one, by their original start */
    overrides?: Record<string, Record<string, unknown>>;
}

/**
 * The fields an event is written with: the document's, and `event.add`'s. `start` and `end` are
 * `YYYY-MM-DD` dates when `allDay`, RFC 3339 date-times with their offset otherwise; `end` is
 * exclusive (D4).
 */
export type CalendarEventInit<K extends string = string, D = unknown> = {
    /** its id; generated with `createId` when missing */
    id?: string;
    /** what the event is: the registry key that types `data` */
    kind?: K;
    /** its title, as the app wrote it: model data no primitive renders */
    title: string;
    start: PlainDateString | DateTimeString;
    end: PlainDateString | DateTimeString;
    allDay: boolean;
    /** its home zone (IANA, never `"local"`): wall-clock moves and recurrence; else the display zone */
    timeZone?: string;
    /** its calendar (category) */
    calendarId?: string;
    /** the occurrences of a recurring event (requires `recurrence()`) */
    recurrence?: RecurrenceJson;
} & EventFlags &
    DataField<D>;

/** An event of the registry `T` in JSON: a union over its kinds, so `data` is checked per kind. */
export type CalendarEventJson<T extends CalendarTypes = AnyTypes> = {
    [K in KindOf<T>]: CalendarEventInit<K, EventDataOf<T, K>>;
}[KindOf<T>];

/** A calendar (a category of events) in JSON. */
export type CalendarInfoJson<T extends CalendarTypes = AnyTypes> = {
    /** its id; generated with `createId` when missing */
    id?: string;
    /** its title, as the app wrote it (never rendered by a primitive) */
    title: string;
    /** the default of its events' `editable` */
    editable?: boolean;
    /** whether its events show (default true) */
    visible?: boolean;
} & DataField<CalendarDataOf<T>>;

/** The dates the calendar may navigate to: `start` included, `end` excluded (either may be open). */
export interface ValidRangeJson {
    start?: PlainDateString;
    end?: PlainDateString;
}

/** The calendar's settings in JSON: each one optional, the defaults fill the rest (`DEFAULT_SETTINGS`). */
export interface CalendarSettingsJson {
    /** the display zone: an IANA name, or `"local"` (the host's) */
    timeZone?: string;
    /** BCP 47 */
    locale?: string;
    /** the first day of a week, 0 = Sunday; default the locale's */
    firstDayOfWeek?: Weekday;
    /** the days of the week no view shows */
    hiddenDays?: Weekday[];
    /** how weeks are numbered */
    weekNumbers?: "iso" | "locale";
    /** a time grid's slot, in minutes */
    slotDuration?: number;
    /** the first time a time grid shows (`HH:mm`) */
    slotMinTime?: PlainTimeString;
    /** the end of what a time grid shows (`HH:mm`, up to `24:00`) */
    slotMaxTime?: PlainTimeString;
    /** the step a drag snaps to, in minutes; default the slot */
    snapDuration?: number;
    validRange?: ValidRangeJson;
    /** the occurrences a day grid's day shows before the rest are hidden; `"auto"`: what fits; `null`: all */
    dayMaxEvents?: number | "auto" | null;
    /** the wall clock (`HH:mm`) a timed end must reach to show on its last day (D4) */
    nextDayThreshold?: PlainTimeString;
    /** minutes: a timed event made from an all-day one, or added without an end */
    defaultTimedDuration?: number;
    /** days: an all-day event made from a timed one, or added without an end */
    defaultAllDayDuration?: number;
    /** whether a move between all-day and timed keeps the event's duration (D10) */
    allDayMaintainDuration?: boolean;
    /** how occurrences are ordered when they tie (`start,-duration,allDay,title`) */
    eventOrder?: string;
    /** minutes: the least an occurrence counts for in a time grid's overlap */
    eventMinDuration?: number;
    /** whether a month view always shows six weeks */
    fixedWeekCount?: boolean;
    /** the default of every event's `editable` */
    editable?: boolean;
    /** the default of every event's `startEditable` (default `editable`) */
    startEditable?: boolean;
    /** the default of every event's `durationEditable` (default `editable`) */
    durationEditable?: boolean;
    /** the default of every event's `deletable` (default `editable`) */
    deletable?: boolean;
}

/** A view type (D7). */
export type ViewType = "month" | "week" | "day" | "days" | "list";

/** The view in JSON: written by `get("calendar-json", { includeView: true })`, loaded when given. */
export interface ViewJson {
    type: ViewType;
    /** the date the view is built around */
    anchorDate: PlainDateString;
    /** `days` views: how many days (1–14) */
    days?: number;
    /** `list` views: how many days; without it, the anchor's month */
    duration?: number;
}

/** A calendar document, version 1 (D3). */
export interface CalendarDocument<T extends CalendarTypes = AnyTypes> {
    version: 1;
    events: CalendarEventJson<T>[];
    calendars?: CalendarInfoJson<T>[];
    settings?: CalendarSettingsJson;
    /** the view (model state, not document: only with `includeView`, D7) */
    view?: ViewJson;
}
