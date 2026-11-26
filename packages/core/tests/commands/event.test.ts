// The event commands (D8) with their rules inside (D9, D10): moves keep the duration, between the
// all-day row and the time grid they take the default durations (FullCalendar's tested
// behaviour), whole days keep the wall clock across DST, nonsense is refused, and `can` / `check`
// answer what `run` would.
import { describe, expect, it } from "vitest";
import { allDay, modelOf, timed } from "../fixture";

const times = (model: ReturnType<typeof modelOf>, id: string) => {
    const event = model.get("event-by", { id });
    return event && [event.start, event.end, event.allDay];
};

describe("event.add", () => {
    it("refuses an unknown home zone without an end instead of throwing", () => {
        const model = modelOf();
        for (const timeZone of ["Nope/Zone", "local"]) {
            const payload = {
                title: "Review",
                start: "2026-11-26T14:00:00Z",
                allDay: false,
                timeZone,
            };
            expect(() => model.run("event.add", payload)).not.toThrow();
            expect(model.run("event.add", payload)).toMatchObject({
                ok: false,
                error: { code: "invalid_payload", path: "/timeZone" },
            });
            expect(
                model.run("batch", {
                    commands: [{ command: "event.add", payload }],
                }),
            ).toMatchObject({ ok: false, error: { code: "invalid_payload" } });
        }
        expect(model.get("events")).toHaveLength(0);
    });

    it("adds an event with a generated id", () => {
        const model = modelOf();
        const result = model.run("event.add", {
            title: "Review",
            start: "2026-11-26T14:00:00Z",
            end: "2026-11-26T15:00:00Z",
            allDay: false,
        });
        expect(result).toEqual({ ok: true, value: { eventId: "event-1" } });
        expect(model.get("events")).toHaveLength(1);
    });

    it("fills a missing end with the default durations", () => {
        const model = modelOf([], {
            defaultTimedDuration: 45,
            defaultAllDayDuration: 2,
        });
        model.run("event.add", {
            id: "t",
            title: "t",
            start: "2026-11-26T14:00:00Z",
            allDay: false,
        });
        model.run("event.add", {
            id: "d",
            title: "d",
            start: "2026-11-26",
            allDay: true,
        });
        expect(times(model, "t")).toEqual([
            "2026-11-26T14:00:00Z",
            "2026-11-26T14:45:00Z",
            false,
        ]);
        expect(times(model, "d")).toEqual(["2026-11-26", "2026-11-28", true]);
    });

    it("refuses nonsense, and an id or a calendar that does not fit", () => {
        const model = modelOf([allDay("a", "2026-11-26", "2026-11-27")]);
        const add = (payload: object) =>
            model.run("event.add", {
                title: "x",
                allDay: true,
                start: "2026-11-26",
                ...payload,
            } as never);
        expect(add({ end: "2026-11-26" })).toMatchObject({
            ok: false,
            error: { code: "invalid_payload", path: "/end" },
        });
        expect(
            add({ start: "2026-11-26T09:00:00Z", end: "2026-11-27" }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/start" },
        });
        expect(add({ id: "a" })).toMatchObject({
            error: { code: "invalid_payload", path: "/id" },
        });
        expect(add({ calendarId: "none" })).toMatchObject({
            error: { code: "not_found", path: "/calendarId" },
        });
        expect(add({ timeZone: "local" })).toMatchObject({
            error: { code: "invalid_payload", path: "/timeZone" },
        });
        expect(add({ recurrence: { rule: "FREQ=DAILY" } })).toMatchObject({
            error: { code: "invalid_payload", path: "/recurrence" },
        });
        expect(add({ title: 3 })).toMatchObject({
            error: { code: "invalid_payload", path: "/title" },
        });
        expect(model.get("events")).toHaveLength(1);
    });
});

describe("event.update", () => {
    it("changes fields, and null removes an optional one", () => {
        const model = modelOf([
            timed("a", "09:00", "10:00", { timeZone: "Europe/London" }),
        ]);
        expect(
            model.run("event.update", {
                eventId: "a",
                title: "A",
                timeZone: null,
                end: "2026-11-26T11:00:00Z",
            }),
        ).toEqual({ ok: true, value: { eventId: "a" } });
        const event = model.get("event-by", { id: "a" });
        expect(event?.title).toBe("A");
        expect(event?.timeZone).toBeUndefined();
        expect(event?.end).toBe("2026-11-26T11:00:00Z");
    });

    it("refuses times in the wrong form for allDay, an end before the start, and an unknown calendar", () => {
        const model = modelOf([timed("a", "09:00", "10:00")]);
        expect(
            model.run("event.update", { eventId: "a", allDay: true }),
        ).toMatchObject({
            error: { code: "invalid_payload" },
        });
        expect(
            model.run("event.update", {
                eventId: "a",
                end: "2026-11-26T08:00:00Z",
            }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/end" },
        });
        expect(
            model.run("event.update", { eventId: "a", calendarId: "none" }),
        ).toMatchObject({
            error: { code: "not_found", path: "/calendarId" },
        });
        expect(model.run("event.update", { eventId: "none" })).toMatchObject({
            error: { code: "not_found", path: "/eventId" },
        });
    });

    it("turns an event all-day when given dates", () => {
        const model = modelOf([timed("a", "09:00", "10:00")]);
        expect(
            model.run("event.update", {
                eventId: "a",
                allDay: true,
                start: "2026-11-26",
                end: "2026-11-27",
            }).ok,
        ).toBe(true);
        expect(times(model, "a")).toEqual(["2026-11-26", "2026-11-27", true]);
    });
});

describe("event.move", () => {
    it("moves a timed event to a new start keeping its duration, written in its zone", () => {
        const model = modelOf([timed("a", "09:00", "10:30")]);
        expect(
            model.run("event.move", {
                eventId: "a",
                start: "2026-11-27T11:00:00-03:00",
            }),
        ).toEqual({
            ok: true,
            value: {
                eventId: "a",
                start: "2026-11-27T14:00:00Z",
                end: "2026-11-27T15:30:00Z",
                allDay: false,
            },
        });
    });

    it("moves an all-day event keeping its days", () => {
        const model = modelOf([allDay("a", "2026-11-24", "2026-11-27")]);
        model.run("event.move", { eventId: "a", start: "2026-12-01" });
        expect(times(model, "a")).toEqual(["2026-12-01", "2026-12-04", true]);
    });

    it("makes a timed event all-day for defaultAllDayDuration (D10)", () => {
        const model = modelOf([timed("a", "09:00", "2026-11-28T10:00:00Z")], {
            defaultAllDayDuration: 1,
        });
        model.run("event.move", {
            eventId: "a",
            start: "2026-11-30",
            allDay: true,
        });
        expect(times(model, "a")).toEqual(["2026-11-30", "2026-12-01", true]);
    });

    it("keeps the days a timed event covered with allDayMaintainDuration", () => {
        const model = modelOf([timed("a", "09:00", "2026-11-28T10:00:00Z")], {
            allDayMaintainDuration: true,
        });
        model.run("event.move", {
            eventId: "a",
            start: "2026-11-30",
            allDay: true,
        });
        expect(times(model, "a")).toEqual(["2026-11-30", "2026-12-03", true]);
    });

    it("starts an all-day event at the drop slot for defaultTimedDuration (D10)", () => {
        const model = modelOf([allDay("a", "2026-11-24", "2026-11-27")], {
            defaultTimedDuration: 90,
        });
        model.run("event.move", {
            eventId: "a",
            start: "2026-11-25T08:00:00Z",
            allDay: false,
        });
        expect(times(model, "a")).toEqual([
            "2026-11-25T08:00:00Z",
            "2026-11-25T09:30:00Z",
            false,
        ]);
    });

    it("keeps an all-day event's days on the wall clock with allDayMaintainDuration", () => {
        const model = modelOf([allDay("a", "2026-11-24", "2026-11-26")], {
            allDayMaintainDuration: true,
        });
        model.run("event.move", {
            eventId: "a",
            start: "2026-11-25T08:00:00Z",
            allDay: false,
        });
        expect(times(model, "a")).toEqual([
            "2026-11-25T08:00:00Z",
            "2026-11-27T08:00:00Z",
            false,
        ]);
    });

    it("refuses a start in the wrong form for the target", () => {
        const model = modelOf([timed("a", "09:00", "10:00")]);
        expect(
            model.run("event.move", { eventId: "a", start: "2026-11-27" }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/start" },
        });
        expect(
            model.run("event.move", {
                eventId: "a",
                start: "2026-11-27T09:00:00Z",
                allDay: true,
            }),
        ).toMatchObject({ error: { code: "invalid_payload", path: "/start" } });
    });

    it("moves by whole days keeping the wall clock across DST, and by minutes exactly", () => {
        const model = modelOf([
            timed(
                "a",
                "2026-03-07T09:00:00-05:00",
                "2026-03-07T10:00:00-05:00",
                {
                    timeZone: "America/New_York",
                },
            ),
        ]);
        model.run("event.move", { eventId: "a", delta: { days: 1 } });
        expect(times(model, "a")).toEqual([
            "2026-03-08T09:00:00-04:00",
            "2026-03-08T10:00:00-04:00",
            false,
        ]);
        model.run("event.move", {
            eventId: "a",
            delta: { days: -1, minutes: 30 },
        });
        // back a day on the wall clock (09:00 EST), then 30 exact minutes
        expect(times(model, "a")).toEqual([
            "2026-03-07T09:30:00-05:00",
            "2026-03-07T10:30:00-05:00",
            false,
        ]);
    });

    it("keeps the wall clock in the display zone for an event without a zone", () => {
        const model = modelOf(
            [
                timed(
                    "a",
                    "2026-10-24T09:00:00+01:00",
                    "2026-10-24T10:00:00+01:00",
                ),
            ],
            { timeZone: "Europe/London" },
        );
        model.run("event.move", { eventId: "a", delta: { days: 1 } });
        expect(times(model, "a")).toEqual([
            "2026-10-25T09:00:00Z",
            "2026-10-25T10:00:00Z",
            false,
        ]);
    });

    it("moves an all-day event by days, and makes it timed by minutes", () => {
        const model = modelOf([
            allDay("a", "2026-11-24", "2026-11-25"),
            allDay("b", "2026-11-24", "2026-11-25"),
        ]);
        model.run("event.move", { eventId: "a", delta: { days: 2 } });
        model.run("event.move", {
            eventId: "b",
            delta: { days: 1, minutes: 600 },
        });
        expect(times(model, "a")).toEqual(["2026-11-26", "2026-11-27", true]);
        expect(times(model, "b")).toEqual([
            "2026-11-25T10:00:00Z",
            "2026-11-25T11:00:00Z",
            false,
        ]);
    });
});

describe("event.resize", () => {
    it("moves an edge, and refuses an end not after the start", () => {
        const model = modelOf([
            timed("a", "09:00", "10:00"),
            allDay("b", "2026-11-24", "2026-11-25"),
        ]);
        model.run("event.resize", {
            eventId: "a",
            edge: "end",
            to: "2026-11-26T12:00:00Z",
        });
        model.run("event.resize", {
            eventId: "b",
            edge: "start",
            to: "2026-11-23",
        });
        expect(times(model, "a")).toEqual([
            "2026-11-26T09:00:00Z",
            "2026-11-26T12:00:00Z",
            false,
        ]);
        expect(times(model, "b")).toEqual(["2026-11-23", "2026-11-25", true]);
        expect(
            model.run("event.resize", {
                eventId: "a",
                edge: "end",
                to: "2026-11-26T09:00:00Z",
            }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/to" },
        });
        expect(
            model.run("event.resize", {
                eventId: "b",
                edge: "end",
                to: "2026-11-23",
            }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/to" },
        });
        expect(
            model.run("event.resize", {
                eventId: "b",
                edge: "end",
                to: "2026-11-26T09:00:00Z",
            }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/to" },
        });
    });
});

describe("event.remove, set-data, set-flags", () => {
    it("removes an event", () => {
        const model = modelOf([allDay("a", "2026-11-24", "2026-11-25")]);
        expect(model.run("event.remove", { eventId: "a" })).toEqual({
            ok: true,
            value: { eventId: "a" },
        });
        expect(model.get("events")).toEqual([]);
        expect(model.run("event.remove", { eventId: "a" })).toMatchObject({
            error: { code: "not_found" },
        });
    });

    it("replaces the data and the kind, and refuses data that is not JSON", () => {
        const model = modelOf([
            allDay("a", "2026-11-24", "2026-11-25", { data: { x: 1 } }),
        ]);
        model.run("event.set-data", {
            eventId: "a",
            kind: "meeting",
            data: { room: "Blue" },
        });
        expect(model.get("event-by", { id: "a" })).toMatchObject({
            kind: "meeting",
            data: { room: "Blue" },
        });
        model.run("event.set-data", { eventId: "a" });
        expect(model.get("event-by", { id: "a" })?.data).toBeUndefined();
        expect(
            model.run("event.set-data", { eventId: "a", data: { f: () => 1 } }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/data/f" },
        });
    });

    it("sets and removes flags", () => {
        const model = modelOf([
            allDay("a", "2026-11-24", "2026-11-25", { deletable: false }),
        ]);
        model.run("event.set-flags", {
            eventId: "a",
            editable: false,
            deletable: null,
        });
        const event = model.get("event-by", { id: "a" });
        expect(event?.editable).toBe(false);
        expect(event?.deletable).toBeUndefined();
    });
});

describe("the edit rules (D9)", () => {
    const calendars = [
        { id: "locked", title: "Locked", editable: false },
        { id: "open", title: "Open" },
    ];

    it("takes the most specific flag: the event, its calendar, then the settings", () => {
        const model = modelOf(
            [
                allDay("own", "2026-11-24", "2026-11-25", {
                    calendarId: "locked",
                    editable: true,
                }),
                allDay("cal", "2026-11-24", "2026-11-25", {
                    calendarId: "locked",
                }),
                allDay("set", "2026-11-24", "2026-11-25", {
                    calendarId: "open",
                }),
                allDay("start", "2026-11-24", "2026-11-25", {
                    startEditable: false,
                }),
            ],
            { editable: false, durationEditable: true },
            { calendars },
        );
        expect(model.get("event-permissions-by", { eventId: "own" })).toEqual({
            editable: true,
            startEditable: true,
            durationEditable: true,
            deletable: true,
        });
        expect(model.is("event-editable", { eventId: "cal" })).toBe(false);
        expect(model.is("event-duration-editable", { eventId: "set" })).toBe(
            true,
        );
        expect(model.is("event-start-editable", { eventId: "set" })).toBe(
            false,
        );
        expect(model.is("event-start-editable", { eventId: "start" })).toBe(
            false,
        );
        expect(
            model.get("event-permissions-by", { eventId: "none" }),
        ).toBeUndefined();
    });

    it("refuses with the reason, and can / check answer the same as run", () => {
        const model = modelOf(
            [
                allDay("fixed", "2026-11-24", "2026-11-25", {
                    startEditable: false,
                    deletable: false,
                }),
                allDay("cal", "2026-11-24", "2026-11-25", {
                    calendarId: "locked",
                }),
            ],
            {},
            { calendars },
        );
        const cases = [
            [
                "event.move",
                { eventId: "fixed", delta: { days: 1 } },
                'event "fixed" cannot move: its start is not editable (the event says so)',
            ],
            [
                "event.resize",
                { eventId: "fixed", edge: "start", to: "2026-11-23" },
                'event "fixed" cannot move: its start is not editable (the event says so)',
            ],
            [
                "event.remove",
                { eventId: "fixed" },
                'event "fixed" cannot be removed (the event says so)',
            ],
            [
                "event.update",
                { eventId: "cal", title: "x" },
                'event "cal" cannot be changed (its calendar says so)',
            ],
            [
                "event.resize",
                { eventId: "cal", edge: "end", to: "2026-11-26" },
                'event "cal" cannot be resized: its duration is not editable (its calendar says so)',
            ],
        ] as const;
        for (const [command, payload, message] of cases) {
            const refused = {
                ok: false,
                error: { code: "refused", message, path: "/eventId" },
            };
            expect(model.check(command, payload as never)).toEqual(refused);
            expect(model.can(command, payload as never)).toBe(false);
            expect(model.run(command, payload as never)).toEqual(refused);
        }
        // the end of a fixed-start event may still change
        expect(
            model.can("event.resize", {
                eventId: "fixed",
                edge: "end",
                to: "2026-11-26",
            }),
        ).toBe(true);
    });

    it("lets the app change flags and data whatever the flags", () => {
        const model = modelOf([
            allDay("a", "2026-11-24", "2026-11-25", { editable: false }),
        ]);
        expect(
            model.run("event.set-flags", { eventId: "a", editable: true }).ok,
        ).toBe(true);
        expect(
            model.run("event.move", { eventId: "a", delta: { days: 1 } }).ok,
        ).toBe(true);
    });
});

describe("occurrences without recurrence()", () => {
    it("refuses occurrenceId and scope as invalid fields naming the recurrence feature", () => {
        const model = modelOf([allDay("a", "2026-11-24", "2026-11-25")]);
        for (const field of [
            { occurrenceId: "a" },
            { scope: "all" },
        ] as const) {
            expect(
                model.run("event.remove", { eventId: "a", ...field }),
            ).toEqual({
                ok: false,
                error: {
                    code: "invalid_payload",
                    message: `"${Object.keys(field)[0]}" requires the recurrence feature (\`@fragiola/calendar/recurrence\`)`,
                    path: `/${Object.keys(field)[0]}`,
                },
            });
        }
    });
});

describe("event.set-all (an app's controlled list)", () => {
    it("replaces every event, keeping the objects it holds and ignoring the edit flags", () => {
        const model = modelOf(
            [
                allDay("a", "2026-11-26", "2026-11-27"),
                allDay("b", "2026-11-27", "2026-11-28", { deletable: false }),
            ],
            { editable: false },
        );
        const [a] = model.state.events;
        const result = model.run("event.set-all", {
            events: [a as never, timed("c", "09:00", "10:00")],
        });
        expect(result).toEqual({
            ok: true,
            value: { eventIds: ["a", "c"], removedEventIds: ["b"] },
        });
        expect(model.state.events[0]).toBe(a);
        expect(model.get("event-by", { id: "c" })?.start).toBe(
            "2026-11-26T09:00:00Z",
        );
    });

    it("commits nothing new for the list it holds", () => {
        const model = modelOf([allDay("a", "2026-11-26", "2026-11-27")]);
        const before = model.state.events;
        expect(
            model.run("event.set-all", { events: [...before] as never }).ok,
        ).toBe(true);
        expect(model.state.events).toBe(before);
    });

    it("refuses an event without an id, a repeated id, an unknown calendar and nonsense", () => {
        const model = modelOf([allDay("a", "2026-11-26", "2026-11-27")]);
        const { id: _, ...noId } = allDay("x", "2026-11-26", "2026-11-27");
        const cases = [
            [[noId], "invalid_payload", "/events/0/id"],
            [
                [
                    allDay("a", "2026-11-26", "2026-11-27"),
                    allDay("a", "2026-11-26", "2026-11-27"),
                ],
                "invalid_payload",
                "/events/1/id",
            ],
            [
                [allDay("a", "2026-11-26", "2026-11-27", { calendarId: "no" })],
                "not_found",
                "/events/0/calendarId",
            ],
            [
                [allDay("a", "2026-11-27", "2026-11-26")],
                "invalid_payload",
                undefined,
            ],
            [
                [
                    allDay("a", "2026-11-26", "2026-11-27", {
                        recurrence: { rule: "FREQ=DAILY" },
                    }),
                ],
                "invalid_payload",
                "/events/0/recurrence",
            ],
        ] as const;
        for (const [events, code, path] of cases) {
            const result = model.run("event.set-all", {
                events: events as never,
            });
            expect(result).toMatchObject({ ok: false, error: { code } });
            if (path && !result.ok) expect(result.error.path).toBe(path);
        }
        expect(model.state.events.map((event) => event.id)).toEqual(["a"]);
    });
});
