// The document (D3): validated by its JSON Schema and the rules past it, every issue with its JSON
// path; ids generated with `createId`; frozen; a round trip through `calendar-json` is stable; a
// field of a feature that is not installed is an issue, never dropped.
import { describe, expect, it } from "vitest";
import {
    CalendarValidationError,
    createCalendarModel,
    DEFAULT_SETTINGS,
    defineFeature,
    validateCalendar,
} from "../../src/index";
import { allDay, documentOf, modelOf, NOW, timed } from "../fixture";

/** The issues of a document, as `path message` lines. */
function issuesOf(json: unknown): string[] {
    return validateCalendar(json).map(
        (issue) => `${issue.path} ${issue.message}`,
    );
}

describe("loading a document", () => {
    it("loads an empty calendar without a document, viewing today's month", () => {
        const model = createCalendarModel(undefined, { now: () => NOW });
        expect(model.state.events).toEqual([]);
        expect(model.state.calendars).toEqual([]);
        expect(model.state.settings).toEqual(DEFAULT_SETTINGS);
        expect(model.get("view").type).toBe("month");
    });

    it("anchors the default view on today in the display zone", () => {
        // 2026-11-26T01:00Z is still the 25th in Sao Paulo
        const model = createCalendarModel(
            {
                version: 1,
                events: [],
                settings: { timeZone: "America/Sao_Paulo" },
            },
            { now: () => Date.UTC(2026, 10, 26, 1) },
        );
        expect(model.get("view").anchorDate).toBe("2026-11-25");
        expect(model.get("today")).toBe("2026-11-25");
    });

    it("fills the settings' defaults and keeps what the document gives", () => {
        const model = modelOf([], { slotDuration: 15, locale: "pt-BR" });
        expect(model.state.settings).toMatchObject({
            ...DEFAULT_SETTINGS,
            timeZone: "UTC",
            slotDuration: 15,
            locale: "pt-BR",
            firstDayOfWeek: 0,
        });
    });

    it("generates missing ids with createId, skipping those in use", () => {
        const asked: string[] = [];
        const ids = ["c1", "a", "x"];
        const model = createCalendarModel(
            documentOf(
                [
                    allDay("a", "2026-11-26", "2026-11-27"),
                    {
                        title: "no id",
                        start: "2026-11-26",
                        end: "2026-11-27",
                        allDay: true,
                    },
                ],
                {},
                { calendars: [{ title: "Work" }] },
            ),
            {
                now: () => NOW,
                createId: (kind) => {
                    asked.push(kind);
                    return ids.shift() ?? "z";
                },
            },
        );
        expect(model.state.calendars.map((calendar) => calendar.id)).toEqual([
            "c1",
        ]);
        expect(model.state.events.map((event) => event.id)).toEqual(["a", "x"]);
        expect(asked).toEqual(["calendar", "event", "event"]);
    });

    it("generates deterministic ids by default (no crypto)", () => {
        const model = modelOf([
            {
                title: "one",
                start: "2026-11-26",
                end: "2026-11-27",
                allDay: true,
            },
        ]);
        expect(model.state.events[0]?.id).toBe("event-1");
    });

    it("freezes the state, and copies what the caller still owns", () => {
        const data = { room: "Blue" };
        const model = modelOf([
            allDay("a", "2026-11-26", "2026-11-27", { data }),
        ]);
        data.room = "Red";
        const event = model.state.events[0];
        expect(event?.data).toEqual({ room: "Blue" });
        expect(Object.isFrozen(model.state)).toBe(true);
        expect(Object.isFrozen(event)).toBe(true);
        expect(Object.isFrozen(event?.data)).toBe(true);
        expect(Object.isFrozen(model.state.settings)).toBe(true);
    });

    it("round-trips through calendar-json, and leaves the view out unless asked", () => {
        const json = documentOf(
            [
                allDay("a", "2026-11-24", "2026-11-27", {
                    calendarId: "work",
                    editable: false,
                }),
                timed("b", "09:00", "10:00", {
                    timeZone: "America/New_York",
                    data: { n: 1 },
                }),
            ],
            { hiddenDays: [0, 6], validRange: { start: "2026-01-01" } },
            {
                calendars: [
                    { id: "work", title: "Work", visible: false, data: [1] },
                ],
            },
        );
        const first = modelOf(json.events, json.settings, json).get(
            "calendar-json",
        );
        expect(first.view).toBeUndefined();
        const second = createCalendarModel(first, { now: () => NOW }).get(
            "calendar-json",
        );
        expect(second).toEqual(first);
        expect(first.events[1]).toEqual(json.events[1]);
    });

    it("writes and loads the view with includeView", () => {
        const model = modelOf(
            [],
            {},
            { view: { type: "days", anchorDate: "2026-12-01", days: 3 } },
        );
        const json = model.get("calendar-json", { includeView: true });
        expect(json.view).toEqual({
            type: "days",
            anchorDate: "2026-12-01",
            days: 3,
        });
        expect(
            createCalendarModel(json, { now: () => NOW }).get("view"),
        ).toEqual(json.view);
    });

    it("hands out a writable copy", () => {
        const model = modelOf([allDay("a", "2026-11-26", "2026-11-27")]);
        const json = model.get("calendar-json");
        const [first] = json.events;
        if (first) first.title = "changed";
        expect(model.state.events[0]?.title).toBe("a");
    });
});

describe("refusing an invalid document", () => {
    it("throws a CalendarValidationError with every issue and its JSON path", () => {
        let thrown: unknown;
        try {
            createCalendarModel({
                version: 1,
                events: [{ title: 1, start: "2026-11-26", allDay: true }],
            } as never);
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBeInstanceOf(CalendarValidationError);
        const issues = (thrown as CalendarValidationError).issues;
        expect(issues.map((issue) => issue.path)).toEqual([
            "/events/0/end",
            "/events/0/title",
        ]);
        expect((thrown as Error).message).toMatch(
            /^Invalid calendar document: \/events\/0\/end/,
        );
    });

    it("validateCalendar returns the issues instead (none for a valid document)", () => {
        expect(
            validateCalendar(
                documentOf([allDay("a", "2026-11-26", "2026-11-27")]),
            ),
        ).toEqual([]);
        expect(issuesOf({ version: 2, events: [] })).toEqual([
            "/version must be 1",
        ]);
        expect(issuesOf({ version: 1, events: [], extra: 1 })).toEqual([
            "/extra is not allowed",
        ]);
        expect(issuesOf("calendar")).toEqual([" must be an object"]);
    });

    it("refuses what is not JSON", () => {
        expect(
            issuesOf({
                version: 1,
                events: [],
                settings: { slotDuration: Number.NaN },
            }),
        ).toEqual(["/settings/slotDuration must be a finite number"]);
    });

    it.each([
        [
            allDay("a", "2026-11-26", "2026-11-26"),
            "/events/0/end must be after start",
        ],
        [
            allDay("a", "2026-11-27", "2026-11-26"),
            "/events/0/end must be after start",
        ],
        [
            allDay("a", "2026-02-30", "2026-03-01"),
            '/events/0/start "2026-02-30" is not a date',
        ],
        [allDay("a", "2026-11-26T09:00:00Z", "2026-11-27"), "/events/0/start"],
        [
            timed("a", "10:00", "09:00"),
            "/events/0/end must not be before start",
        ],
        [timed("a", "2026-11-26T09:00:00", "10:00"), "/events/0/start"],
        [timed("a", "2026-11-26", "10:00"), "/events/0/start"],
        [
            timed("a", "09:00", "10:00", { timeZone: "local" }),
            '/events/0/timeZone an event\'s home zone is an IANA name, not "local"',
        ],
        [
            timed("a", "09:00", "10:00", { timeZone: "Mars/Base" }),
            "/events/0/timeZone",
        ],
        [
            timed("a", "09:00", "10:00", { calendarId: "none" }),
            '/events/0/calendarId no calendar has the id "none"',
        ],
    ])("refuses an event that is nonsense: %j", (event, expected) => {
        const issues = issuesOf(documentOf([event]));
        expect(issues.some((issue) => issue.startsWith(expected))).toBe(true);
    });

    it("accepts a zero-length timed event (a deadline)", () => {
        expect(issuesOf(documentOf([timed("a", "09:00", "09:00")]))).toEqual(
            [],
        );
    });

    it("refuses an id used twice", () => {
        expect(
            issuesOf(
                documentOf(
                    [
                        allDay("a", "2026-11-26", "2026-11-27"),
                        allDay("a", "2026-11-26", "2026-11-27"),
                    ],
                    {},
                    {
                        calendars: [
                            { id: "c", title: "C" },
                            { id: "c", title: "D" },
                        ],
                    },
                ),
            ),
        ).toEqual([
            '/calendars/1/id "c" is the id of another calendar',
            '/events/1/id "a" is the id of another event',
        ]);
    });

    it.each([
        [{ timeZone: "Nowhere/City" }, "/settings/timeZone"],
        [{ locale: "not a locale!" }, "/settings/locale"],
        [
            { slotMinTime: "10:00", slotMaxTime: "09:00" },
            "/settings/slotMaxTime slotMaxTime must be after slotMinTime",
        ],
        [{ slotMaxTime: "24:30" }, "/settings/slotMaxTime"],
        [
            { nextDayThreshold: "24:00" },
            "/settings/nextDayThreshold must be before 24:00",
        ],
        [
            { validRange: { start: "2026-12-01", end: "2026-11-01" } },
            "/settings/validRange/end must be after start",
        ],
        [
            { hiddenDays: [0, 1, 2, 3, 4, 5, 6] },
            "/settings/hiddenDays cannot hide every day of the week",
        ],
        [
            { hiddenDays: [1, 1] },
            "/settings/hiddenDays must not repeat an item",
        ],
        [{ eventOrder: "start,,title" }, "/settings/eventOrder"],
        [{ firstDayOfWeek: 7 }, "/settings/firstDayOfWeek must be one of"],
        [{ dayMaxEvents: 0 }, "/settings/dayMaxEvents"],
        [{ slotDuration: 0 }, "/settings/slotDuration must be >= 1"],
    ] as const)(
        "refuses settings that are nonsense: %j",
        (settings, expected) => {
            const issues = issuesOf(documentOf([], settings as never));
            expect(issues.some((issue) => issue.startsWith(expected))).toBe(
                true,
            );
        },
    );

    it.each([
        [
            { type: "days", anchorDate: "2026-11-26" },
            '/view/days is required for a "days" view',
        ],
        [
            { type: "week", anchorDate: "2026-11-26", days: 3 },
            '/view/days only a "days" view takes days',
        ],
        [
            { type: "month", anchorDate: "2026-11-26", duration: 3 },
            '/view/duration only a "list" view takes a duration',
        ],
        [{ type: "month", anchorDate: "26/11/2026" }, "/view/anchorDate"],
    ] as const)("refuses a view that is nonsense: %j", (view, expected) => {
        const issues = issuesOf(documentOf([], {}, { view: view as never }));
        expect(issues.some((issue) => issue.startsWith(expected))).toBe(true);
    });
});

describe("the fields of features", () => {
    const recurring = documentOf([
        allDay("a", "2026-11-26", "2026-11-27", {
            recurrence: { rule: "FREQ=DAILY" },
        }),
    ]);

    it("refuses a field of a feature that is not installed, naming the feature", () => {
        expect(issuesOf(recurring)).toEqual([
            "/events/0/recurrence requires the recurrence feature (`@fragiola/calendar/recurrence`)",
        ]);
        expect(() => createCalendarModel(recurring)).toThrow(
            CalendarValidationError,
        );
    });

    it("loads it with the feature installed, and writes it back", () => {
        const recurrence = defineFeature({ name: "recurrence" });
        expect(validateCalendar(recurring, { features: [recurrence] })).toEqual(
            [],
        );
        const model = createCalendarModel(recurring, {
            features: [recurrence],
            now: () => NOW,
        });
        expect(model.get("calendar-json").events[0]?.recurrence).toEqual({
            rule: "FREQ=DAILY",
        });
    });

    it("runs an installed feature's own rules on an event's fields", () => {
        const recurrence = defineFeature({
            name: "recurrence",
            eventIssues: (event, path) =>
                event.recurrence === undefined
                    ? []
                    : [
                          {
                              path: `${path}/recurrence/rule`,
                              message: "unsupported",
                          },
                      ],
        });
        expect(validateCalendar(recurring, { features: [recurrence] })).toEqual(
            [{ path: "/events/0/recurrence/rule", message: "unsupported" }],
        );
    });
});
