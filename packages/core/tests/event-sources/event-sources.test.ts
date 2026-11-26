// Event sources (a state feature; FullCalendar's lazy fetching as the reference): the ranges of
// the visible range each source has not been fetched for, its loading ranges, and
// `event-sources.receive` replacing that source's events in that range atomically (one event).
import { describe, expect, it } from "vitest";
import { eventSources } from "../../src/event-sources/index";
import {
    type CalendarEventJson,
    type CalendarSettingsJson,
    validateCalendar,
} from "../../src/index";
import { allDay, documentOf, modelOf, timed } from "../fixture";

const SOURCES: CalendarSettingsJson = {
    eventSources: [{ id: "holidays", calendarId: "public" }, { id: "team" }],
};

const sourced = (
    events: CalendarEventJson[] = [],
    settings: CalendarSettingsJson = SOURCES,
) =>
    modelOf(
        events,
        settings,
        { calendars: [{ id: "public", title: "Public" }] },
        {
            features: [eventSources()],
        },
    );

const NOVEMBER = { start: "2026-11-01", end: "2026-12-13" };

describe("ranges-to-fetch", () => {
    it("asks every source for the visible range, then only what is not fetched or loading", () => {
        const model = sourced();
        expect(model.get("ranges-to-fetch")).toEqual([
            { sourceId: "holidays", range: NOVEMBER },
            { sourceId: "team", range: NOVEMBER },
        ]);
        model.run("event-sources.set-loading", {
            sourceId: "team",
            range: NOVEMBER,
            loading: true,
        });
        expect(model.is("event-source-loading", { sourceId: "team" })).toBe(
            true,
        );
        expect(model.is("event-source-loading")).toBe(true);
        model.run("event-sources.receive", {
            sourceId: "holidays",
            range: NOVEMBER,
            events: [],
        });
        expect(model.get("ranges-to-fetch")).toEqual([]);
        // the next month asks only for the days not received yet
        model.run("view.next", {});
        expect(model.get("ranges-to-fetch")).toEqual([
            {
                sourceId: "holidays",
                range: { start: "2026-12-13", end: "2027-01-10" },
            },
            {
                sourceId: "team",
                range: { start: "2026-12-13", end: "2027-01-10" },
            },
        ]);
        expect(
            model.get("ranges-to-fetch", {
                range: { start: "2026-10-25", end: "2026-11-08" },
            }),
        ).toEqual([
            {
                sourceId: "holidays",
                range: { start: "2026-10-25", end: "2026-11-01" },
            },
            {
                sourceId: "team",
                range: { start: "2026-10-25", end: "2026-11-01" },
            },
        ]);
    });

    it("forgets a failed fetch, and what is invalidated", () => {
        const model = sourced();
        model.run("event-sources.set-loading", {
            sourceId: "team",
            range: NOVEMBER,
            loading: true,
        });
        model.run("event-sources.set-loading", {
            sourceId: "team",
            range: NOVEMBER,
            loading: false,
        });
        expect(model.is("event-source-loading", { sourceId: "team" })).toBe(
            false,
        );
        model.run("event-sources.receive", {
            sourceId: "team",
            range: NOVEMBER,
            events: [],
        });
        model.run("event-sources.receive", {
            sourceId: "holidays",
            range: NOVEMBER,
            events: [],
        });
        expect(
            model.run("event-sources.invalidate", {
                range: { start: "2026-11-10", end: "2026-11-12" },
            }),
        ).toEqual({
            ok: true,
            value: { sourceIds: ["holidays", "team"] },
        });
        expect(model.get("event-source-by", { id: "team" })).toEqual({
            id: "team",
            fetched: [
                { start: "2026-11-01", end: "2026-11-10" },
                { start: "2026-11-12", end: "2026-12-13" },
            ],
            loading: [],
        });
        model.run("event-sources.invalidate", { sourceId: "holidays" });
        expect(
            model.get("ranges-to-fetch").map((entry) => entry.sourceId),
        ).toEqual(["holidays", "team"]);
    });
});

describe("event-sources.receive", () => {
    it("replaces the source's events in the range, atomically, in one event", () => {
        const model = sourced([
            allDay("old", "2026-11-15", "2026-11-16", {
                sourceId: "holidays",
                calendarId: "public",
            }),
            allDay("outside", "2026-10-12", "2026-10-13", {
                sourceId: "holidays",
                calendarId: "public",
            }),
            allDay("mine", "2026-11-15", "2026-11-16"),
        ]);
        const commits: string[] = [];
        model.subscribe((event) => commits.push(event.command));
        model.run("event-sources.set-loading", {
            sourceId: "holidays",
            range: NOVEMBER,
            loading: true,
        });
        expect(
            model.run("event-sources.receive", {
                sourceId: "holidays",
                range: NOVEMBER,
                events: [
                    {
                        id: "republic",
                        title: "Republic Day",
                        start: "2026-11-15",
                        end: "2026-11-16",
                        allDay: true,
                    },
                    {
                        title: "Black Awareness",
                        start: "2026-11-20",
                        end: "2026-11-21",
                        allDay: true,
                    },
                ],
            }),
        ).toEqual({
            ok: true,
            value: {
                sourceId: "holidays",
                eventIds: ["republic", "event-1"],
                removedEventIds: ["old"],
            },
        });
        expect(commits).toEqual([
            "event-sources.set-loading",
            "event-sources.receive",
        ]);
        expect(
            model
                .get("events")
                .map((event) => [event.id, event.sourceId, event.calendarId]),
        ).toEqual([
            ["outside", "holidays", "public"],
            ["mine", undefined, undefined],
            ["republic", "holidays", "public"],
            ["event-1", "holidays", "public"],
        ]);
        expect(model.is("event-source-loading")).toBe(false);
        expect(
            model
                .get("calendar-json")
                .events.find((event) => event.id === "republic"),
        ).toEqual({
            id: "republic",
            title: "Republic Day",
            start: "2026-11-15",
            end: "2026-11-16",
            allDay: true,
            calendarId: "public",
            sourceId: "holidays",
        });
    });

    it("replaces an event received again by its id, wherever it was", () => {
        const model = sourced([
            timed("t", "09:00", "10:00", {
                sourceId: "team",
                date: "2026-10-01",
            }),
        ]);
        model.run("event-sources.receive", {
            sourceId: "team",
            range: NOVEMBER,
            events: [
                {
                    id: "t",
                    title: "moved",
                    start: "2026-11-26T09:00:00Z",
                    end: "2026-11-26T10:00:00Z",
                    allDay: false,
                },
            ],
        });
        expect(model.get("events")).toHaveLength(1);
        expect(model.get("event-by", { id: "t" })?.start).toBe(
            "2026-11-26T09:00:00Z",
        );
    });

    it("refuses what does not fit, and applies nothing then", () => {
        const model = sourced([allDay("mine", "2026-11-15", "2026-11-16")]);
        const receive = (events: CalendarEventJson[], sourceId = "team") =>
            model.check("event-sources.receive", {
                sourceId,
                range: NOVEMBER,
                events,
            });
        const before = model.state;
        expect(receive([], "nope")).toMatchObject({
            error: { code: "not_found", path: "/sourceId" },
        });
        expect(
            receive([allDay("mine", "2026-11-01", "2026-11-02")]),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/events/0/id" },
        });
        expect(
            receive([
                allDay("a", "2026-11-01", "2026-11-02"),
                allDay("bad", "2026-11-03", "2026-11-03"),
            ]),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/events/1/end" },
        });
        expect(
            receive([
                allDay("a", "2026-11-01", "2026-11-02", { calendarId: "x" }),
            ]),
        ).toMatchObject({
            error: { code: "not_found", path: "/events/0/calendarId" },
        });
        expect(
            model.check("event-sources.receive", {
                sourceId: "team",
                range: { start: "2026-11-02", end: "2026-11-01" },
                events: [],
            }),
        ).toMatchObject({ error: { code: "invalid_payload", path: "/range" } });
        expect(model.state).toBe(before);
    });
});

describe("sources in the document and the settings", () => {
    it("an event's source must exist; a source's calendar too", () => {
        expect(
            validateCalendar(
                documentOf(
                    [
                        allDay("a", "2026-11-01", "2026-11-02", {
                            sourceId: "nope",
                        }),
                    ],
                    {
                        eventSources: [
                            { id: "s", calendarId: "missing" },
                            { id: "s" },
                        ],
                    },
                ),
                { features: [eventSources()] },
            ).map((issue) => issue.path),
        ).toEqual([
            "/settings/eventSources/1/id",
            "/settings/eventSources/0/calendarId",
            "/events/0/sourceId",
        ]);
        expect(validateCalendar(documentOf([], SOURCES))[0]?.message).toBe(
            "requires the event-sources feature (`@fragiola/calendar/event-sources`)",
        );
    });

    it("removing a source removes its events and what was fetched", () => {
        const model = sourced([
            allDay("h", "2026-11-15", "2026-11-16", { sourceId: "holidays" }),
        ]);
        model.run("event-sources.receive", {
            sourceId: "holidays",
            range: NOVEMBER,
            events: [],
        });
        model.run("event-sources.set-loading", {
            sourceId: "team",
            range: NOVEMBER,
            loading: true,
        });
        model.run("settings.set", {
            settings: { eventSources: [{ id: "team" }] },
        });
        expect(model.get("events")).toEqual([]);
        expect(
            model.get("event-source-by", { id: "holidays" }),
        ).toBeUndefined();
        expect(model.state.eventSourceStates).toEqual({
            team: { fetched: [], loading: [NOVEMBER] },
        });
        expect(
            model.check("event.add", {
                title: "x",
                start: "2026-11-01",
                allDay: true,
                sourceId: "holidays",
            }),
        ).toMatchObject({
            ok: false,
            error: { code: "not_found", path: "/sourceId" },
        });
    });

    it("does not write what was fetched into the document", () => {
        const model = sourced();
        model.run("event-sources.receive", {
            sourceId: "team",
            range: NOVEMBER,
            events: [],
        });
        expect(model.get("calendar-json")).not.toHaveProperty(
            "eventSourceStates",
        );
        expect(model.get("calendar-json").settings?.eventSources).toEqual(
            SOURCES.eventSources,
        );
    });
});
