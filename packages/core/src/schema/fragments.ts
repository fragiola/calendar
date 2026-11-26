// The schema pieces the document and the commands share, inline (`FromSchema` does not follow
// `$ref`, and each command's schema stays self-contained for an assistant reading it). A pattern
// only shapes a value: the time domain's strict parsers check it (D4).

export const ID = { type: "string", minLength: 1 } as const;

export const PLAIN_DATE = {
    type: "string",
    pattern: "^\\d{4}-\\d{2}-\\d{2}$",
    description: "a date, YYYY-MM-DD",
} as const;

export const PLAIN_TIME = {
    type: "string",
    pattern: "^\\d{2}:\\d{2}$",
    description: "a wall-clock time, HH:mm (24:00 is the end of a day)",
} as const;

export const DATE_OR_DATE_TIME = {
    type: "string",
    description:
        "YYYY-MM-DD for an all-day event, an RFC 3339 date-time with its offset otherwise (2026-11-26T09:30:00-03:00)",
} as const;

export const WEEKDAY = {
    enum: [0, 1, 2, 3, 4, 5, 6],
    description: "a day of the week, 0 = Sunday",
} as const;

export const TIME_ZONE = {
    type: "string",
    minLength: 1,
    description: "an IANA time zone name (America/Sao_Paulo)",
} as const;

export const POSITIVE_MINUTES = {
    type: "integer",
    minimum: 1,
    maximum: 1440,
} as const;

/** The data an app attaches: any JSON (narrowed by its `Types` registry). */
export const DATA = { description: "the app's data (any JSON)" } as const;

export const EVENT_FLAGS = {
    editable: { type: "boolean" },
    startEditable: { type: "boolean" },
    durationEditable: { type: "boolean" },
    deletable: { type: "boolean" },
} as const;

export const RECURRENCE = {
    type: "object",
    description: "the occurrences of a recurring event (requires recurrence())",
    properties: {
        rule: { type: "string", minLength: 1 },
        exdates: { type: "array", items: { type: "string" } },
        overrides: {
            type: "object",
            additionalProperties: { type: "object" },
        },
    },
    required: ["rule"],
    additionalProperties: false,
} as const;

/** An event's own fields (the document's and `event.add`'s), but `id`. */
export const EVENT_FIELDS = {
    kind: { type: "string", minLength: 1 },
    title: { type: "string" },
    start: DATE_OR_DATE_TIME,
    end: DATE_OR_DATE_TIME,
    allDay: { type: "boolean" },
    timeZone: TIME_ZONE,
    calendarId: ID,
    recurrence: RECURRENCE,
    sourceId: {
        ...ID,
        description: "the event source it came from (requires eventSources())",
    },
    data: DATA,
    ...EVENT_FLAGS,
} as const;

export const CALENDAR_FIELDS = {
    title: { type: "string" },
    editable: { type: "boolean" },
    visible: { type: "boolean" },
    data: DATA,
} as const;

export const VALID_RANGE = {
    type: "object",
    properties: { start: PLAIN_DATE, end: PLAIN_DATE },
    additionalProperties: false,
} as const;

/** A range of a constraint: dates (a day's start in the display zone) or RFC 3339 date-times. */
export const CONSTRAINT_RANGE = {
    type: "object",
    properties: {
        start: {
            type: "string",
            description: "YYYY-MM-DD or an RFC 3339 date-time",
        },
        end: {
            type: "string",
            description: "YYYY-MM-DD or an RFC 3339 date-time (exclusive)",
        },
    },
    additionalProperties: false,
} as const;

/** Where events (or a selection) may be: within business hours, or within one of the ranges. */
export const CONSTRAINT = {
    anyOf: [
        { const: "business-hours" },
        { type: "array", items: CONSTRAINT_RANGE },
    ],
    description:
        '"business-hours", or ranges one of which must hold it (requires constraints())',
} as const;

/** The business hours of some days of the week, in the display zone. */
export const BUSINESS_HOURS = {
    type: "object",
    properties: {
        daysOfWeek: { type: "array", items: WEEKDAY, uniqueItems: true },
        startTime: PLAIN_TIME,
        endTime: PLAIN_TIME,
    },
    required: ["daysOfWeek", "startTime", "endTime"],
    additionalProperties: false,
} as const;

/** An event source the app fetches events from. */
export const EVENT_SOURCE = {
    type: "object",
    properties: {
        id: ID,
        calendarId: { ...ID, description: "the calendar its events go to" },
    },
    required: ["id"],
    additionalProperties: false,
} as const;

/** Every core setting, each optional (the document's and `settings.set`'s). */
export const SETTINGS_FIELDS = {
    timeZone: {
        type: "string",
        minLength: 1,
        description: 'the display zone: an IANA name, or "local"',
    },
    locale: { type: "string", minLength: 1, description: "BCP 47" },
    firstDayOfWeek: WEEKDAY,
    hiddenDays: { type: "array", items: WEEKDAY, uniqueItems: true },
    weekNumbers: { enum: ["iso", "locale"] },
    slotDuration: POSITIVE_MINUTES,
    slotMinTime: PLAIN_TIME,
    slotMaxTime: PLAIN_TIME,
    snapDuration: POSITIVE_MINUTES,
    validRange: VALID_RANGE,
    dayMaxEvents: {
        anyOf: [
            { type: "integer", minimum: 1 },
            { const: "auto" },
            { type: "null" },
        ],
    },
    nextDayThreshold: PLAIN_TIME,
    defaultTimedDuration: { type: "integer", minimum: 1 },
    defaultAllDayDuration: { type: "integer", minimum: 1 },
    allDayMaintainDuration: { type: "boolean" },
    eventOrder: {
        type: "string",
        description:
            "comma-separated fields, each optionally preceded by - for descending",
    },
    eventMinDuration: { type: "integer", minimum: 0 },
    fixedWeekCount: { type: "boolean" },
    editable: { type: "boolean" },
    startEditable: { type: "boolean" },
    durationEditable: { type: "boolean" },
    deletable: { type: "boolean" },
    businessHours: {
        type: "array",
        items: BUSINESS_HOURS,
        description:
            "the business hours, per days of the week, in the display zone (requires constraints())",
    },
    eventConstraint: CONSTRAINT,
    selectConstraint: CONSTRAINT,
    overlap: {
        anyOf: [
            { type: "boolean" },
            { type: "object", additionalProperties: { type: "boolean" } },
        ],
        description:
            "whether events may overlap: for all, or per calendar id (requires constraints())",
    },
    eventSources: {
        type: "array",
        items: EVENT_SOURCE,
        description:
            "the event sources the app fetches (requires eventSources())",
    },
} as const;

export const VIEW_TYPE = {
    enum: ["month", "week", "day", "days", "list"],
} as const;

export const VIEW_DAYS = { type: "integer", minimum: 1, maximum: 14 } as const;

export const LIST_DURATION = {
    type: "integer",
    minimum: 1,
    maximum: 366,
} as const;

export const VIEW = {
    type: "object",
    properties: {
        type: VIEW_TYPE,
        anchorDate: PLAIN_DATE,
        days: VIEW_DAYS,
        duration: LIST_DURATION,
    },
    required: ["type", "anchorDate"],
    additionalProperties: false,
} as const;
