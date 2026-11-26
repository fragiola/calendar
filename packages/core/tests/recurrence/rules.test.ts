// The RRULE subset (D15): parsed and written back, its unsupported parts named; the document and
// the commands refuse what is not a series (without the feature, any recurrence at all).
import { describe, expect, it } from "vitest";
import {
    type CalendarEventJson,
    CalendarValidationError,
    createCalendarModel,
    validateCalendar,
} from "../../src/index";
import {
    formatRecurrenceRule,
    parseRecurrenceRule,
    recurrence,
} from "../../src/recurrence/index";
import { allDay, documentOf, modelOf, NOW } from "../fixture";
import { recurringModel, series } from "./recurrence-fixture";

const messages = (value: string) => {
    const result = parseRecurrenceRule(value, "/rule");
    return result.ok ? [] : result.issues.map((issue) => issue.message);
};

describe("parseRecurrenceRule", () => {
    it("reads every part of the subset", () => {
        expect(
            parseRecurrenceRule(
                "FREQ=MONTHLY;INTERVAL=2;COUNT=10;BYDAY=1SU,-1SU;BYMONTH=1,3;WKST=SU",
            ),
        ).toEqual({
            ok: true,
            value: {
                freq: "MONTHLY",
                interval: 2,
                count: 10,
                byDay: [
                    { weekday: 0, ordinal: 1 },
                    { weekday: 0, ordinal: -1 },
                ],
                byMonth: [1, 3],
                weekStart: 0,
            },
        });
        expect(
            parseRecurrenceRule("freq=yearly;until=20270101;bymonthday=-1"),
        ).toEqual({
            ok: true,
            value: {
                freq: "YEARLY",
                interval: 1,
                until: "2027-01-01",
                byMonthDay: [-1],
                weekStart: 1,
            },
        });
        expect(
            parseRecurrenceRule("FREQ=DAILY;UNTIL=20270101T120000Z"),
        ).toMatchObject({
            ok: true,
            value: { until: "2027-01-01T12:00:00Z" },
        });
    });

    it("names the part it does not support", () => {
        expect(messages("FREQ=YEARLY;BYYEARDAY=1,100")).toEqual([
            "BYYEARDAY is not supported (the rule subset is FREQ, INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY, BYMONTH, WKST)",
        ]);
        expect(messages("FREQ=MONTHLY;BYDAY=MO;BYSETPOS=-1")[0]).toMatch(
            /^BYSETPOS is not supported/,
        );
        expect(messages("FREQ=YEARLY;BYWEEKNO=20")[0]).toMatch(
            /^BYWEEKNO is not supported/,
        );
        expect(messages("FREQ=HOURLY")).toEqual([
            "FREQ=HOURLY is not supported (DAILY, WEEKLY, MONTHLY or YEARLY)",
        ]);
        expect(messages("FREQ=DAILY;COLOR=RED")[0]).toMatch(
            /^COLOR is not an RRULE part/,
        );
    });

    it("refuses nonsense, never repairs it", () => {
        expect(messages("INTERVAL=2")).toEqual(["FREQ is required"]);
        expect(messages("FREQ=DAILY;COUNT=3;UNTIL=20270101")).toEqual([
            "COUNT and UNTIL cannot both be given",
        ]);
        expect(messages("FREQ=WEEKLY;BYMONTHDAY=1")).toEqual([
            "BYMONTHDAY is not for a WEEKLY rule",
        ]);
        expect(messages("FREQ=WEEKLY;BYDAY=2MO")[0]).toMatch(
            /only for a MONTHLY or YEARLY rule/,
        );
        expect(messages("FREQ=DAILY;INTERVAL=0")).toEqual([
            "INTERVAL=0 is not a positive integer",
        ]);
        expect(messages("FREQ=DAILY;UNTIL=20270101T120000")[0]).toMatch(
            /is a local time/,
        );
        expect(messages("FREQ=DAILY;UNTIL=20270230")[0]).toMatch(
            /is not a date/,
        );
        expect(messages("FREQ=MONTHLY;BYMONTHDAY=0")[0]).toMatch(
            /^BYMONTHDAY=0/,
        );
        expect(messages("FREQ=DAILY;;COUNT=2")).toEqual([
            "has an empty part (parts are NAME=VALUE, joined by ;)",
        ]);
        expect(messages("FREQ=DAILY;FREQ=WEEKLY")).toEqual([
            "FREQ is given twice",
        ]);
        expect(messages("RRULE:FREQ=DAILY")[0]).toMatch(
            /not an RRULE part|not supported/,
        );
        expect(parseRecurrenceRule(42)).toMatchObject({ ok: false });
    });

    it("writes a rule back", () => {
        for (const rule of [
            "FREQ=WEEKLY;BYDAY=MO,WE",
            "FREQ=MONTHLY;INTERVAL=2;COUNT=10;BYDAY=1SU,-1SU",
            "FREQ=YEARLY;UNTIL=20270101T120000Z;BYMONTH=3;BYDAY=TH;WKST=SU",
            "FREQ=DAILY;UNTIL=20270101;BYMONTHDAY=1,-1",
        ]) {
            const parsed = parseRecurrenceRule(rule);
            expect(parsed.ok && formatRecurrenceRule(parsed.value)).toBe(rule);
        }
    });
});

describe("without recurrence()", () => {
    it("a document with a recurrence is an issue naming the feature", () => {
        const doc = documentOf([series("r", "2026-11-02", "FREQ=DAILY")]);
        expect(validateCalendar(doc)).toEqual([
            {
                path: "/events/0/recurrence",
                message:
                    "requires the recurrence feature (`@fragiola/calendar/recurrence`)",
            },
        ]);
        expect(() => createCalendarModel(doc)).toThrow(CalendarValidationError);
    });

    it("an edit's scope is an invalid payload naming the feature", () => {
        const model = modelOf([allDay("a", "2026-11-24", "2026-11-25")]);
        // typed in the core's payloads (types cost no bytes), refused at run time
        expect(
            model.run("event.move", {
                eventId: "a",
                delta: { days: 1 },
                scope: "all",
            }),
        ).toEqual({
            ok: false,
            error: {
                code: "invalid_payload",
                message:
                    '"scope" requires the recurrence feature (`@fragiola/calendar/recurrence`)',
                path: "/scope",
            },
        });
        const set = "event.set-recurrence";
        // @ts-expect-error: recurrence()'s command
        const result = model.run(set, { eventId: "a", recurrence: null });
        expect(result).toMatchObject({
            ok: false,
            error: { code: "not_found" },
        });
    });
});

describe("the document with recurrence()", () => {
    const load = (event: CalendarEventJson) =>
        validateCalendar(
            documentOf([event], { timeZone: "America/New_York" }),
            {
                features: [recurrence()],
            },
        );

    it("names the unsupported part of a rule, at the rule", () => {
        expect(
            load(series("r", "2026-11-02", "FREQ=YEARLY;BYSETPOS=1")),
        ).toEqual([
            {
                path: "/events/0/recurrence/rule",
                message:
                    "BYSETPOS is not supported (the rule subset is FREQ, INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY, BYMONTH, WKST)",
            },
        ]);
    });

    it("refuses excluded dates and overrides that are no original start of the series", () => {
        expect(
            load(
                series("r", "2026-11-02", "FREQ=WEEKLY", {
                    recurrence: {
                        rule: "FREQ=WEEKLY",
                        exdates: ["2026-11-09"],
                        overrides: {
                            "2026-11-16T09:00:00-05:00": {
                                start: "2026-11-16T10:00:00-05:00",
                            },
                            "2026-11-23T09:00:00-05:00": { color: "red" },
                        },
                    },
                }),
            ).map((issue) => issue.path),
        ).toEqual([
            "/events/0/recurrence/exdates/0",
            "/events/0/recurrence/overrides/2026-11-16T09:00:00-05:00",
            "/events/0/recurrence/overrides/2026-11-23T09:00:00-05:00/color",
        ]);
        expect(
            load(
                series("r", "2026-11-02", "FREQ=WEEKLY", {
                    recurrence: {
                        rule: "FREQ=WEEKLY",
                        overrides: {
                            "2026-11-10T09:00:00-05:00": { title: "Off" },
                        },
                    },
                }),
            ),
        ).toEqual([
            {
                path: "/events/0/recurrence/overrides/2026-11-10T09:00:00-05:00",
                message:
                    "is not an occurrence of the rule (an override is keyed by an original start)",
            },
        ]);
        expect(
            load(
                allDay("b", "2026-11-26", "2026-11-27", {
                    recurrence: { rule: "FREQ=YEARLY;UNTIL=20300101T000000Z" },
                }),
            ),
        ).toEqual([
            {
                path: "/events/0/recurrence/rule",
                message: "UNTIL of an all-day event is a date (YYYYMMDD)",
            },
        ]);
    });

    it("round-trips a series through calendar-json", () => {
        const event = series("r", "2026-11-02", "FREQ=WEEKLY;BYDAY=MO", {
            recurrence: {
                rule: "FREQ=WEEKLY;BYDAY=MO",
                exdates: ["2026-11-09T09:00:00-05:00"],
                overrides: { "2026-11-16T09:00:00-05:00": { title: "Retro" } },
            },
        });
        const json = recurringModel([event]).get("calendar-json");
        expect(json.events).toEqual([event]);
        expect(recurringModel(json.events).get("calendar-json")).toEqual(json);
    });
});

describe("event.set-recurrence and event-recurring", () => {
    it("makes an event recurring, changes its rule, makes it single again", () => {
        const model = createCalendarModel(
            documentOf([allDay("b", "2026-11-26", "2026-11-27")]),
            {
                features: [recurrence()],
                now: () => NOW,
            },
        );
        expect(model.is("event-recurring", { eventId: "b" })).toBe(false);
        expect(
            model.run("event.set-recurrence", {
                eventId: "b",
                recurrence: { rule: "FREQ=YEARLY" },
            }),
        ).toEqual({ ok: true, value: { eventId: "b" } });
        expect(model.is("event-recurring", { eventId: "b" })).toBe(true);
        expect(
            model
                .get("occurrences-in", {
                    range: { start: "2026-01-01", end: "2029-01-01" },
                })
                .map((o) => o.occurrenceId),
        ).toEqual(["b@2026-11-26", "b@2027-11-26", "b@2028-11-26"]);
        expect(
            model.check("event.set-recurrence", {
                eventId: "b",
                recurrence: { rule: "FREQ=YEARLY;BYHOUR=9" },
            }),
        ).toMatchObject({
            ok: false,
            error: { code: "invalid_payload", path: "/recurrence/rule" },
        });
        expect(
            model.check("event.set-recurrence", {
                eventId: "b",
                recurrence: {
                    rule: "FREQ=YEARLY",
                    overrides: { "2027-11-27": { title: "x" } },
                },
            }),
        ).toMatchObject({
            ok: false,
            error: {
                code: "invalid_payload",
                path: "/recurrence/overrides/2027-11-27",
            },
        });
        model.run("event.set-recurrence", { eventId: "b", recurrence: null });
        expect(model.get("event-by", { id: "b" })?.recurrence).toBeUndefined();
        model.run("event.set-flags", { eventId: "b", editable: false });
        expect(
            model.check("event.set-recurrence", {
                eventId: "b",
                recurrence: { rule: "FREQ=DAILY" },
            }),
        ).toMatchObject({ ok: false, error: { code: "refused" } });
    });
});
