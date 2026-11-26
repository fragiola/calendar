// The edit scopes (D15), each with its document before and after: `this` writes an override (an
// excluded date for a removal), `following` ends the series before the occurrence and starts a
// new one from it (one command, one event, the new id from `createId`), `all` changes the series.
import { describe, expect, it } from "vitest";
import type { CalendarEventJson } from "../../src/index";
import { recurringModel } from "./recurrence-fixture";

/** A weekly series on Mondays and Wednesdays at 09:00 New York time, from Monday 2026-11-02. */
const weekly = (more: Partial<CalendarEventJson> = {}): CalendarEventJson => ({
    id: "w",
    title: "Standup",
    start: "2026-11-02T09:00:00-05:00",
    end: "2026-11-02T09:30:00-05:00",
    allDay: false,
    timeZone: "America/New_York",
    recurrence: { rule: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6" },
    ...more,
});

/** The events of a model's document, as JSON. */
const eventsOf = (model: ReturnType<typeof recurringModel>) =>
    model.get("calendar-json").events;

const occurrence = (start: string) => `w@${start}`;

describe("scope required", () => {
    it("an occurrence needs a scope; this and following need an occurrence", () => {
        const model = recurringModel([weekly()]);
        expect(
            model.check("event.move", {
                eventId: "w",
                occurrenceId: occurrence("2026-11-04T09:00:00-05:00"),
                delta: { minutes: 60 },
            }),
        ).toMatchObject({
            ok: false,
            error: { code: "invalid_payload", path: "/scope" },
        });
        expect(
            model.check("event.remove", { eventId: "w", scope: "this" }),
        ).toMatchObject({
            ok: false,
            error: { code: "invalid_payload", path: "/occurrenceId" },
        });
        expect(
            model.check("event.remove", {
                eventId: "w",
                occurrenceId: occurrence("2026-11-05T09:00:00-05:00"),
                scope: "this",
            }),
        ).toMatchObject({
            ok: false,
            error: { code: "not_found", path: "/occurrenceId" },
        });
    });

    it("finds an occurrence by its original start in any offset", () => {
        const model = recurringModel([weekly()]);
        expect(
            model.get("occurrence-by", { id: "w@2026-11-04T14:00:00Z" }),
        ).toMatchObject({
            occurrenceId: "w@2026-11-04T09:00:00-05:00",
            start: "2026-11-04T09:00:00-05:00",
        });
        expect(model.get("occurrence-by", { id: "w" })).toBeUndefined();
        expect(
            model.get("occurrence-by", { id: "w@2026-11-03T14:00:00Z" }),
        ).toBeUndefined();
    });
});

describe('scope "this"', () => {
    it("a move writes an override; moving it back removes it", () => {
        const model = recurringModel([weekly()]);
        const id = occurrence("2026-11-04T09:00:00-05:00");
        expect(
            model.run("event.move", {
                eventId: "w",
                occurrenceId: id,
                scope: "this",
                delta: { minutes: 60 },
            }),
        ).toEqual({
            ok: true,
            value: {
                eventId: "w",
                start: "2026-11-04T10:00:00-05:00",
                end: "2026-11-04T10:30:00-05:00",
                allDay: false,
            },
        });
        expect(eventsOf(model)[0]?.recurrence).toEqual({
            rule: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6",
            overrides: {
                "2026-11-04T09:00:00-05:00": {
                    start: "2026-11-04T10:00:00-05:00",
                    end: "2026-11-04T10:30:00-05:00",
                },
            },
        });
        expect(model.get("occurrence-by", { id })).toMatchObject({
            start: "2026-11-04T10:00:00-05:00",
        });
        model.run("event.move", {
            eventId: "w",
            occurrenceId: id,
            scope: "this",
            delta: { minutes: -60 },
        });
        expect(eventsOf(model)[0]?.recurrence).toEqual({
            rule: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6",
        });
    });

    it("a rename and a resize of one occurrence; the series' zone and calendar are refused", () => {
        const model = recurringModel([weekly()], {});
        const id = occurrence("2026-11-09T09:00:00-05:00");
        model.run("event.update", {
            eventId: "w",
            occurrenceId: id,
            scope: "this",
            title: "Retro",
        });
        model.run("event.resize", {
            eventId: "w",
            occurrenceId: id,
            scope: "this",
            edge: "end",
            to: "2026-11-09T10:00:00-05:00",
        });
        expect(eventsOf(model)[0]?.recurrence?.overrides).toEqual({
            "2026-11-09T09:00:00-05:00": {
                title: "Retro",
                start: "2026-11-09T09:00:00-05:00",
                end: "2026-11-09T10:00:00-05:00",
            },
        });
        expect(model.get("occurrence-by", { id })).toMatchObject({
            title: "Retro",
        });
        expect(
            model.check("event.update", {
                eventId: "w",
                occurrenceId: id,
                scope: "this",
                timeZone: "UTC",
            }),
        ).toMatchObject({
            ok: false,
            error: { code: "refused", path: "/timeZone" },
        });
    });

    it("a removal excludes the date", () => {
        const model = recurringModel([weekly()]);
        model.run("event.remove", {
            eventId: "w",
            occurrenceId: occurrence("2026-11-04T09:00:00-05:00"),
            scope: "this",
        });
        expect(eventsOf(model)[0]?.recurrence).toEqual({
            rule: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6",
            exdates: ["2026-11-04T09:00:00-05:00"],
        });
        expect(
            model
                .get("occurrences-in", {
                    range: { start: "2026-11-01", end: "2026-12-01" },
                })
                .map((o) => o.start),
        ).toEqual([
            "2026-11-02T09:00:00-05:00",
            "2026-11-09T09:00:00-05:00",
            "2026-11-11T09:00:00-05:00",
            "2026-11-16T09:00:00-05:00",
            "2026-11-18T09:00:00-05:00",
        ]);
    });
});

describe('scope "following"', () => {
    it("a move ends the series before the occurrence and starts a new one, in one event", () => {
        const model = recurringModel([weekly()]);
        const events: string[] = [];
        model.subscribe((event) => events.push(event.command));
        const result = model.run("event.move", {
            eventId: "w",
            occurrenceId: occurrence("2026-11-09T09:00:00-05:00"),
            scope: "following",
            delta: { minutes: 30 },
        });
        expect(result).toMatchObject({
            ok: true,
            value: { eventId: "event-1", start: "2026-11-09T09:30:00-05:00" },
        });
        expect(events).toEqual(["event.move"]);
        expect(eventsOf(model)).toEqual([
            {
                ...weekly(),
                recurrence: {
                    rule: "FREQ=WEEKLY;UNTIL=20261109T135959Z;BYDAY=MO,WE",
                },
            },
            {
                ...weekly(),
                id: "event-1",
                start: "2026-11-09T09:30:00-05:00",
                end: "2026-11-09T10:00:00-05:00",
                recurrence: { rule: "FREQ=WEEKLY;COUNT=4;BYDAY=MO,WE" },
            },
        ]);
        expect(
            model
                .get("occurrences-in", {
                    range: { start: "2026-11-01", end: "2026-12-01" },
                })
                .map((o) => o.occurrenceId),
        ).toEqual([
            "w@2026-11-02T09:00:00-05:00",
            "w@2026-11-04T09:00:00-05:00",
            "event-1@2026-11-09T09:30:00-05:00",
            "event-1@2026-11-11T09:30:00-05:00",
            "event-1@2026-11-16T09:30:00-05:00",
            "event-1@2026-11-18T09:30:00-05:00",
        ]);
    });

    it("excluded dates and overrides after the occurrence move to the new series", () => {
        const model = recurringModel([
            weekly({
                recurrence: {
                    rule: "FREQ=WEEKLY;BYDAY=MO,WE",
                    exdates: [
                        "2026-11-04T09:00:00-05:00",
                        "2026-11-16T09:00:00-05:00",
                    ],
                    overrides: {
                        "2026-11-18T09:00:00-05:00": { title: "Long" },
                    },
                },
            }),
        ]);
        model.run("event.update", {
            eventId: "w",
            occurrenceId: occurrence("2026-11-09T09:00:00-05:00"),
            scope: "following",
            title: "Daily",
        });
        const [before, after] = eventsOf(model);
        expect(before?.recurrence).toEqual({
            rule: "FREQ=WEEKLY;UNTIL=20261109T135959Z;BYDAY=MO,WE",
            exdates: ["2026-11-04T09:00:00-05:00"],
        });
        expect(after).toMatchObject({
            title: "Daily",
            start: "2026-11-09T09:00:00-05:00",
            recurrence: {
                rule: "FREQ=WEEKLY;BYDAY=MO,WE",
                exdates: ["2026-11-16T09:00:00-05:00"],
                overrides: { "2026-11-18T09:00:00-05:00": { title: "Long" } },
            },
        });
    });

    it("a removal ends the series; from the first occurrence it removes the event", () => {
        const model = recurringModel([weekly()]);
        model.run("event.remove", {
            eventId: "w",
            occurrenceId: occurrence("2026-11-11T09:00:00-05:00"),
            scope: "following",
        });
        expect(eventsOf(model)[0]?.recurrence).toEqual({
            rule: "FREQ=WEEKLY;UNTIL=20261111T135959Z;BYDAY=MO,WE",
        });
        model.run("event.remove", {
            eventId: "w",
            occurrenceId: occurrence("2026-11-02T09:00:00-05:00"),
            scope: "following",
        });
        expect(eventsOf(model)).toEqual([]);
    });
});

describe('scope "all"', () => {
    it("a move shifts every occurrence by the same delta, its weekdays with it", () => {
        const model = recurringModel([
            weekly({
                recurrence: {
                    rule: "FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261118T140000Z",
                    exdates: ["2026-11-09T09:00:00-05:00"],
                },
            }),
        ]);
        model.run("event.move", {
            eventId: "w",
            occurrenceId: occurrence("2026-11-04T09:00:00-05:00"),
            scope: "all",
            delta: { days: 1, minutes: 60 },
        });
        expect(eventsOf(model)[0]).toMatchObject({
            start: "2026-11-03T10:00:00-05:00",
            end: "2026-11-03T10:30:00-05:00",
            recurrence: {
                rule: "FREQ=WEEKLY;UNTIL=20261119T150000Z;BYDAY=TU,TH",
                exdates: ["2026-11-10T10:00:00-05:00"],
            },
        });
        expect(
            model
                .get("occurrences-in", {
                    range: { start: "2026-11-01", end: "2026-12-01" },
                })
                .map((o) => o.start),
        ).toEqual([
            "2026-11-03T10:00:00-05:00",
            "2026-11-05T10:00:00-05:00",
            "2026-11-12T10:00:00-05:00",
            "2026-11-17T10:00:00-05:00",
            "2026-11-19T10:00:00-05:00",
        ]);
    });

    it("refuses a move by days that would change a monthly rule's pattern", () => {
        const model = recurringModel([
            weekly({ recurrence: { rule: "FREQ=MONTHLY;BYDAY=1MO" } }),
        ]);
        expect(
            model.check("event.move", {
                eventId: "w",
                occurrenceId: occurrence("2026-12-07T09:00:00-05:00"),
                scope: "all",
                delta: { days: 1 },
            }),
        ).toMatchObject({ ok: false, error: { code: "refused" } });
        expect(
            model.check("event.move", {
                eventId: "w",
                occurrenceId: occurrence("2026-12-07T09:00:00-05:00"),
                scope: "all",
                delta: { minutes: 30 },
            }).ok,
        ).toBe(true);
    });

    it("refuses a move by days of a plain monthly or yearly rule onto or off days 29–31", () => {
        const monthly = (start: string, rule: string): CalendarEventJson => ({
            id: "m",
            title: "Rent",
            start,
            end: start,
            allDay: true,
            recurrence: { rule },
        });
        const move = (start: string, rule: string, days: number) =>
            recurringModel([
                {
                    ...monthly(start, rule),
                    end: start.replace(/..$/, (d) =>
                        String(Number(d) + 1).padStart(2, "0"),
                    ),
                },
            ]).check("event.move", {
                eventId: "m",
                occurrenceId: `m@${start}`,
                scope: "all",
                delta: { days },
            });
        // Jan 30 → 31 would skip every 30-day month; 2028-02-28 → 29 would keep only leap years
        expect(move("2026-01-30", "FREQ=MONTHLY;COUNT=6", 1)).toMatchObject({
            ok: false,
            error: { code: "refused", path: "/scope" },
        });
        expect(move("2028-02-28", "FREQ=YEARLY;COUNT=3", 1)).toMatchObject({
            ok: false,
            error: { code: "refused" },
        });
        // days every month has shift cleanly
        expect(move("2026-01-10", "FREQ=MONTHLY;COUNT=6", 1).ok).toBe(true);
    });

    it("an edit without occurrenceId is an edit of the series; removing it removes the event", () => {
        const model = recurringModel([weekly()]);
        model.run("event.resize", {
            eventId: "w",
            edge: "end",
            to: "2026-11-02T10:00:00-05:00",
        });
        expect(eventsOf(model)[0]).toMatchObject({
            end: "2026-11-02T10:00:00-05:00",
            recurrence: { rule: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6" },
        });
        model.run("event.remove", { eventId: "w", scope: "all" });
        expect(eventsOf(model)).toEqual([]);
    });

    it("refuses turning a series between all-day and timed", () => {
        const model = recurringModel([weekly()]);
        expect(
            model.check("event.move", {
                eventId: "w",
                occurrenceId: occurrence("2026-11-04T09:00:00-05:00"),
                scope: "all",
                start: "2026-11-04",
                allDay: true,
            }),
        ).toMatchObject({
            ok: false,
            error: { code: "refused", path: "/allDay" },
        });
        expect(
            model.check("event.move", {
                eventId: "w",
                occurrenceId: occurrence("2026-11-04T09:00:00-05:00"),
                scope: "this",
                start: "2026-11-04",
                allDay: true,
            }).ok,
        ).toBe(true);
    });

    it("finds an override keyed in another offset, and never throws (a rename of the series)", () => {
        const model = recurringModel([
            weekly({
                recurrence: {
                    rule: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6",
                    overrides: { "2026-11-09T14:00:00Z": { title: "X" } },
                },
            }),
        ]);
        expect(
            model.run("event.update", {
                eventId: "w",
                occurrenceId: "w@2026-11-09T14:00:00Z",
                scope: "all",
                title: "Y",
            }).ok,
        ).toBe(true);
        expect(eventsOf(model)[0]).toMatchObject({
            title: "Y",
            recurrence: {
                overrides: { "2026-11-09T14:00:00Z": { title: "X" } },
            },
        });
    });

    it("a new zone keeps the excluded dates and overrides on their occurrences", () => {
        const model = recurringModel([
            weekly({
                start: "2026-10-05T09:00:00-04:00",
                end: "2026-10-05T09:30:00-04:00",
                recurrence: {
                    rule: "FREQ=WEEKLY",
                    exdates: ["2026-11-16T09:00:00-05:00"],
                    overrides: {
                        "2026-11-23T09:00:00-05:00": { title: "Retro" },
                    },
                },
            }),
        ]);
        model.run("event.update", {
            eventId: "w",
            scope: "all",
            timeZone: "Asia/Tokyo",
        });
        const occurrences = model.get("occurrences-in", {
            range: { start: "2026-11-15", end: "2026-11-30" },
        });
        expect(occurrences.map((o) => [o.start, o.title])).toEqual([
            ["2026-11-23T22:00:00+09:00", "Retro"],
        ]);
    });
});
