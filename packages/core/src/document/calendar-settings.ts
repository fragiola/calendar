// The settings as the model holds them: every core setting with its value, the document's or the
// default (FullCalendar's documented default where D3 fixes none). `firstDayOfWeek`,
// `snapDuration`, `validRange` and the flag defaults other than `editable` stay absent when not
// given: their default is another value (the locale's first day, the slot, no limit, `editable`).
import type { Weekday } from "../time/day-of-week";
import type { ValidRangeJson } from "./calendar-document";

/** The calendar's settings, resolved (`model.state.settings`, `get("settings")`). */
export interface CalendarSettings {
    readonly timeZone: string;
    readonly locale: string;
    readonly firstDayOfWeek?: Weekday;
    readonly hiddenDays: readonly Weekday[];
    readonly weekNumbers: "iso" | "locale";
    readonly slotDuration: number;
    readonly slotMinTime: string;
    readonly slotMaxTime: string;
    readonly snapDuration?: number;
    readonly validRange?: Readonly<ValidRangeJson>;
    readonly dayMaxEvents: number | "auto" | null;
    readonly nextDayThreshold: string;
    readonly defaultTimedDuration: number;
    readonly defaultAllDayDuration: number;
    readonly allDayMaintainDuration: boolean;
    readonly eventOrder: string;
    readonly eventMinDuration: number;
    readonly fixedWeekCount: boolean;
    readonly editable: boolean;
    readonly startEditable?: boolean;
    readonly durationEditable?: boolean;
    readonly deletable?: boolean;
}

/** The settings of a document that gives none. */
export const DEFAULT_SETTINGS: CalendarSettings = Object.freeze({
    timeZone: "local",
    locale: "en-US",
    hiddenDays: Object.freeze([]) as readonly Weekday[],
    weekNumbers: "locale",
    slotDuration: 30,
    slotMinTime: "00:00",
    slotMaxTime: "24:00",
    dayMaxEvents: null,
    nextDayThreshold: "00:00",
    defaultTimedDuration: 60,
    defaultAllDayDuration: 1,
    allDayMaintainDuration: false,
    eventOrder: "start,-duration,allDay,title",
    eventMinDuration: 15,
    fixedWeekCount: true,
    editable: true,
});

/** The settings that may be absent (their default is another value, or none). */
export const OPTIONAL_SETTINGS = [
    "firstDayOfWeek",
    "snapDuration",
    "validRange",
    "startEditable",
    "durationEditable",
    "deletable",
] as const;
