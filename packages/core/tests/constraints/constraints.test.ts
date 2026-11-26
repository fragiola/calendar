// The constraints (FullCalendar's constraint and business-hours behaviour as the reference):
// business hours per weekday and allowed ranges refuse `event.add`, `event.move` and
// `event.resize` outside them, `overlap: false` refuses overlapping occurrences, and `check`
// gives the refusal naming the setting, as a drag's preview will ask (`model.can`).
import { describe, expect, it } from "vitest";
import { constraints } from "../../src/constraints/index";
import { featuresOf } from "../../src/features/registry";
import {
    type CalendarEventJson,
    type CalendarSettingsJson,
    CalendarValidationError,
    createCalendarModel,
    validateCalendar,
} from "../../src/index";
import { recurrence } from "../../src/recurrence/index";
import type { DraftState } from "../../src/state/draft";
import { allDay, documentOf, modelOf, NOW, timed } from "../fixture";

/** Monday to Friday, 09:00–17:00 (FullCalendar's `businessHours: true`). */
const WEEKDAYS = [
    { daysOfWeek: [1, 2, 3, 4, 5], startTime: "09:00", endTime: "17:00" },
] as const;

const model = (events: CalendarEventJson[], settings: CalendarSettingsJson) =>
    modelOf(events, settings, {}, { features: [constraints(), recurrence()] });

describe("without constraints()", () => {
    it("its settings are issues naming the feature", () => {
        expect(validateCalendar(documentOf([], { overlap: false }))).toEqual([
            {
                path: "/settings/overlap",
                message:
                    "requires the constraints feature (`@fragiola/calendar/constraints`)",
            },
        ]);
        expect(
            modelOf().run("settings.set", {
                settings: {
                    businessHours: [...WEEKDAYS].map((r) => ({
                        ...r,
                        daysOfWeek: [...r.daysOfWeek],
                    })),
                },
            }),
        ).toMatchObject({
            ok: false,
            error: { code: "invalid_payload", path: "/settings/businessHours" },
        });
    });
});

describe("eventConstraint: business-hours", () => {
    const settings: CalendarSettingsJson = {
        businessHours: [
            {
                daysOfWeek: [1, 2, 3, 4, 5],
                startTime: "09:00",
                endTime: "17:00",
            },
        ],
        eventConstraint: "business-hours",
    };

    it("refuses an event added, moved or resized outside them, with the setting named", () => {
        // 2026-11-26 is a Thursday
        const calendar = model([timed("a", "10:00", "11:00")], settings);
        expect(
            calendar.check("event.add", {
                title: "late",
                start: "2026-11-26T17:30:00Z",
                end: "2026-11-26T18:00:00Z",
                allDay: false,
            }),
        ).toEqual({
            ok: false,
            error: {
                code: "refused",
                message:
                    'event "event-1" would be outside the business hours (eventConstraint)',
            },
        });
        expect(
            calendar.can("event.move", {
                eventId: "a",
                delta: { minutes: 360 },
            }),
        ).toBe(true);
        expect(
            calendar.check("event.move", {
                eventId: "a",
                delta: { minutes: 420 },
            }),
        ).toMatchObject({
            ok: false,
            error: { code: "refused" },
        });
        expect(
            calendar.can("event.move", { eventId: "a", delta: { days: 2 } }),
        ).toBe(false);
        expect(
            calendar.can("event.resize", {
                eventId: "a",
                edge: "end",
                to: "2026-11-26T17:00:00Z",
            }),
        ).toBe(true);
        expect(
            calendar.can("event.resize", {
                eventId: "a",
                edge: "start",
                to: "2026-11-26T08:30:00Z",
            }),
        ).toBe(false);
    });

    it("merges touching rules, and keeps an all-day event on business days", () => {
        const calendar = model([allDay("d", "2026-11-26", "2026-11-27")], {
            businessHours: [
                { daysOfWeek: [4], startTime: "09:00", endTime: "12:00" },
                { daysOfWeek: [4], startTime: "12:00", endTime: "17:00" },
                { daysOfWeek: [5], startTime: "09:00", endTime: "17:00" },
            ],
            eventConstraint: "business-hours",
        });
        expect(
            calendar.can("event.add", {
                title: "long",
                start: "2026-11-26T10:00:00Z",
                end: "2026-11-26T16:00:00Z",
                allDay: false,
            }),
        ).toBe(true);
        expect(
            calendar.can("event.move", { eventId: "d", delta: { days: 1 } }),
        ).toBe(true);
        expect(
            calendar.check("event.move", { eventId: "d", delta: { days: 2 } }),
        ).toMatchObject({
            error: {
                message:
                    'event "d" would be on 2026-11-28, a day without business hours (eventConstraint)',
            },
        });
    });

    it("does not check an edit that keeps the times (a rename), nor a removal", () => {
        const calendar = model([timed("night", "22:00", "23:00")], settings);
        expect(
            calendar.can("event.update", {
                eventId: "night",
                title: "renamed",
            }),
        ).toBe(true);
        expect(calendar.can("event.remove", { eventId: "night" })).toBe(true);
        expect(
            calendar.can("event.move", {
                eventId: "night",
                delta: { minutes: 30 },
            }),
        ).toBe(false);
    });

    it("reads the business hours on the display zone's wall clock across DST", () => {
        const calendar = model([], {
            ...settings,
            timeZone: "America/New_York",
        });
        for (const day of ["2026-11-02", "2026-10-26"]) {
            const offset = day === "2026-11-02" ? "-05:00" : "-04:00";
            expect(
                calendar.can("event.add", {
                    title: "nine",
                    start: `${day}T09:00:00${offset}`,
                    end: `${day}T17:00:00${offset}`,
                    allDay: false,
                }),
            ).toBe(true);
        }
    });
});

describe("eventConstraint: ranges", () => {
    it("keeps events within one of the ranges, open ends allowed", () => {
        const calendar = model([], {
            eventConstraint: [
                { start: "2026-11-23", end: "2026-11-28" },
                { start: "2026-12-01T09:00:00Z" },
            ],
        });
        const add = (start: string, end: string, allDayEvent = false) =>
            calendar.can("event.add", {
                title: "x",
                start,
                end,
                allDay: allDayEvent,
            });
        expect(add("2026-11-23", "2026-11-28", true)).toBe(true);
        expect(add("2026-11-27", "2026-11-29", true)).toBe(false);
        expect(add("2026-12-01T09:00:00Z", "2030-01-01T00:00:00Z")).toBe(true);
        expect(add("2026-12-01T08:00:00Z", "2026-12-01T10:00:00Z")).toBe(false);
    });
});

describe("overlap", () => {
    const events = [
        timed("a", "09:00", "10:00", { calendarId: "busy" }),
        timed("b", "11:00", "12:00", { calendarId: "free" }),
    ];
    const calendars = {
        calendars: [
            { id: "busy", title: "Busy" },
            { id: "free", title: "Free" },
        ],
    };

    it("false refuses an occurrence overlapping another event's", () => {
        const calendar = modelOf(events, { overlap: false }, calendars, {
            features: [constraints()],
        });
        expect(
            calendar.check("event.move", {
                eventId: "b",
                delta: { minutes: -90 },
            }),
        ).toEqual({
            ok: false,
            error: {
                code: "refused",
                message: 'event "b" overlaps event "a" (the overlap setting)',
            },
        });
        // touching is no overlap, and an event never overlaps itself
        expect(
            calendar.can("event.move", {
                eventId: "b",
                delta: { minutes: -60 },
            }),
        ).toBe(true);
        expect(
            calendar.can("event.resize", {
                eventId: "a",
                edge: "end",
                to: "2026-11-26T10:30:00Z",
            }),
        ).toBe(true);
    });

    it("per calendar: either event's calendar refusing is enough", () => {
        const calendar = modelOf(
            events,
            { overlap: { busy: false } },
            calendars,
            { features: [constraints()] },
        );
        expect(
            calendar.can("event.move", {
                eventId: "b",
                delta: { minutes: -90 },
            }),
        ).toBe(false);
        expect(
            calendar.can("event.add", {
                title: "c",
                start: "2026-11-26T11:30:00Z",
                end: "2026-11-26T12:30:00Z",
                allDay: false,
                calendarId: "free",
            }),
        ).toBe(true);
        expect(
            calendar.can("event.add", {
                title: "c",
                start: "2026-11-26T11:30:00Z",
                end: "2026-11-26T12:30:00Z",
                allDay: false,
                calendarId: "busy",
            }),
        ).toBe(false);
    });

    it("counts a recurring event's occurrences, an all-day event's whole days", () => {
        const calendar = model(
            [
                timed("standup", "09:00", "09:15", {
                    date: "2026-11-02",
                    recurrence: { rule: "FREQ=DAILY" },
                }),
                allDay("trip", "2026-12-01", "2026-12-03"),
            ],
            { overlap: false },
        );
        const add = (start: string, end: string) =>
            calendar.can("event.add", {
                title: "x",
                start,
                end,
                allDay: false,
            });
        expect(add("2026-11-26T09:10:00Z", "2026-11-26T09:40:00Z")).toBe(false);
        expect(add("2026-11-26T09:15:00Z", "2026-11-26T09:40:00Z")).toBe(true);
        expect(add("2026-12-02T15:00:00Z", "2026-12-02T15:30:00Z")).toBe(false);
    });
});

describe("overlap of a series", () => {
    it("checks every occurrence of a series added or given a rule, over a year", () => {
        const calendar = model(
            [timed("meeting", "09:00", "10:00", { date: "2027-03-03" })],
            {
                overlap: false,
            },
        );
        const daily = { rule: "FREQ=DAILY" };
        expect(
            calendar.check("event.add", {
                title: "standup",
                start: "2026-11-26T09:30:00Z",
                end: "2026-11-26T09:45:00Z",
                allDay: false,
                recurrence: daily,
            }),
        ).toMatchObject({
            ok: false,
            error: {
                message:
                    'event "event-1" overlaps event "meeting" (the overlap setting)',
            },
        });
        calendar.run("event.add", {
            id: "standup",
            title: "standup",
            start: "2026-11-26T09:30:00Z",
            end: "2026-11-26T09:45:00Z",
            allDay: false,
        });
        expect(
            calendar.check("event.set-recurrence", {
                eventId: "standup",
                recurrence: daily,
            }),
        ).toMatchObject({ ok: false, error: { code: "refused" } });
        expect(
            calendar.can("event.set-recurrence", {
                eventId: "standup",
                recurrence: {
                    rule: "FREQ=DAILY",
                    exdates: ["2027-03-03T09:30:00Z"],
                },
            }),
        ).toBe(true);
    });
});

describe("selectConstraint", () => {
    it("refuses a selected range outside it (the selection feature's contribution point)", () => {
        const calendar = model([], {
            businessHours: [...WEEKDAYS].map((rule) => ({
                ...rule,
                daysOfWeek: [...rule.daysOfWeek],
            })),
            selectConstraint: "business-hours",
        });
        const features = featuresOf(calendar);
        expect(
            features.checkSelection(calendar.state as unknown as DraftState, {
                start: "2026-11-26T10:00:00Z",
                end: "2026-11-26T11:00:00Z",
                allDay: false,
            }),
        ).toBeUndefined();
        expect(
            features.checkSelection(calendar.state as unknown as DraftState, {
                start: "2026-11-28",
                end: "2026-11-29",
                allDay: true,
            }),
        ).toEqual({
            ok: false,
            error: {
                code: "refused",
                message:
                    "the selection would be on 2026-11-28, a day without business hours (selectConstraint)",
            },
        });
    });
});

describe("the settings", () => {
    it("accepts a range from a date-time to a date, ordered in the display zone", () => {
        const issues = validateCalendar(
            documentOf([], {
                timeZone: "America/New_York",
                // 23:00 New York to the next midnight there: one hour, though UTC reads 04:00Z–00:00Z
                eventConstraint: [
                    { start: "2026-01-01T23:00:00-05:00", end: "2026-01-02" },
                ],
            }),
            { features: [constraints()] },
        );
        expect(issues).toEqual([]);
    });

    it("refuses nonsense", () => {
        const issues = (settings: CalendarSettingsJson) =>
            validateCalendar(documentOf([], settings), {
                features: [constraints()],
            }).map((issue) => issue.path);
        expect(
            issues({
                businessHours: [
                    { daysOfWeek: [1], startTime: "17:00", endTime: "09:00" },
                ],
            }),
        ).toEqual(["/settings/businessHours/0/endTime"]);
        expect(issues({ eventConstraint: "business-hours" })).toEqual([
            "/settings/eventConstraint",
        ]);
        expect(issues({ selectConstraint: [] })).toEqual([
            "/settings/selectConstraint",
        ]);
        expect(
            issues({
                eventConstraint: [
                    { start: "tomorrow" },
                    { start: "2026-11-27", end: "2026-11-26" },
                ],
            }),
        ).toEqual([
            "/settings/eventConstraint/0/start",
            "/settings/eventConstraint/1/end",
        ]);
        expect(() =>
            createCalendarModel(documentOf([], { eventConstraint: [] }), {
                features: [constraints()],
            }),
        ).toThrow(CalendarValidationError);
        const calendar = model([], {});
        expect(
            calendar.check("settings.set", {
                settings: { eventConstraint: "business-hours" },
            }),
        ).toMatchObject({
            ok: false,
            error: {
                code: "invalid_payload",
                path: "/settings/eventConstraint",
            },
        });
        expect(
            calendar.run("settings.set", { settings: { overlap: false } }).ok,
        ).toBe(true);
        expect(
            calendar.run("settings.set", { settings: { overlap: null } }).ok,
        ).toBe(true);
        expect(calendar.get("settings").overlap).toBeUndefined();
    });
});

describe("the business-hours fill", () => {
    const calendar = model([], {
        businessHours: [
            {
                daysOfWeek: [1, 2, 3, 4, 5],
                startTime: "09:00",
                endTime: "17:00",
            },
        ],
        slotMinTime: "06:00",
        slotMaxTime: "18:00",
        timeZone: "America/New_York",
    });

    it("lists each day's hours, as instants and as a time grid's fractions", () => {
        expect(
            calendar.get("business-hours-in", {
                range: { start: "2026-10-31", end: "2026-11-03" },
            }),
        ).toEqual([
            {
                date: "2026-11-02",
                start: "2026-11-02T09:00:00-05:00",
                end: "2026-11-02T17:00:00-05:00",
                top: 0.25,
                height: 8 / 12,
            },
        ]);
        calendar.run("view.set", { type: "week" });
        expect(calendar.get("business-hours-in")).toHaveLength(5);
    });

    it("marks business days and the slots within business hours", () => {
        expect(
            calendar.get("day-attributes-by", { date: "2026-11-26" }),
        ).toMatchObject({
            "data-business-hours": "",
        });
        expect(
            calendar.get("day-attributes-by", { date: "2026-11-28" })?.[
                "data-business-hours"
            ],
        ).toBeUndefined();
        expect(
            calendar.get("slot-attributes-by", {
                date: "2026-11-26",
                time: "09:00",
            }),
        ).toEqual({
            "data-date": "2026-11-26",
            "data-time": "09:00",
            "data-business-hours": "",
        });
        expect(
            calendar.get("slot-attributes-by", {
                date: "2026-11-26",
                time: "17:00",
            })?.["data-business-hours"],
        ).toBeUndefined();
        expect(
            createCalendarModel(documentOf(), {
                features: [constraints()],
                now: () => NOW,
            }).get("day-attributes-by", { date: "2026-11-26" }),
        ).not.toHaveProperty("data-business-hours");
    });
});
