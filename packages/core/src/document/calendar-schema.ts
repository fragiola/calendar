// The JSON Schema of the calendar document, version 1 (D3). One schema describes every feature's
// fields too (an event's `recurrence`): a field of a feature that is not installed is a validation
// issue, never dropped (`validate-calendar.ts`). What a schema cannot say (a date's calendar
// validity, `end` after `start`, a zone, a reference) is checked after it.
import {
    CALENDAR_FIELDS,
    EVENT_FIELDS,
    ID,
    SETTINGS_FIELDS,
    VIEW,
} from "../schema/fragments";

/** An event in the document. */
export const EVENT_SCHEMA = {
    type: "object",
    properties: { id: ID, ...EVENT_FIELDS },
    required: ["title", "start", "end", "allDay"],
    additionalProperties: false,
} as const;

/** A calendar (category) in the document. */
export const CALENDAR_SCHEMA = {
    type: "object",
    properties: { id: ID, ...CALENDAR_FIELDS },
    required: ["title"],
    additionalProperties: false,
} as const;

/** The settings in the document: each optional. */
export const SETTINGS_SCHEMA = {
    type: "object",
    properties: SETTINGS_FIELDS,
    additionalProperties: false,
} as const;

/** The calendar document. */
export const calendarSchema = {
    $id: "https://fragiola.com/calendar/schema/calendar-v1.json",
    title: "Fragiola Calendar document, version 1",
    type: "object",
    properties: {
        version: { const: 1 },
        events: { type: "array", items: EVENT_SCHEMA },
        calendars: { type: "array", items: CALENDAR_SCHEMA },
        settings: SETTINGS_SCHEMA,
        view: VIEW,
    },
    required: ["version", "events"],
    additionalProperties: false,
} as const;
