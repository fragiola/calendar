// The command bus (`model-api.md`): never throws on bad input, `batch` is one atomic step with one
// event, middleware vetoes, rewrites and sees dry runs, listeners hear each commit, `dispatch`
// validates untrusted JSON, and `get("commands")` lists every command with its JSON Schemas.
import { describe, expect, it } from "vitest";
import { type CommandEvent, veto } from "../../src/index";
import { allDay, modelOf } from "../fixture";

const ALL_COMMANDS = [
    "event.add",
    "event.update",
    "event.move",
    "event.resize",
    "event.remove",
    "event.set-data",
    "event.set-flags",
    "event.set-all",
    "calendar.add",
    "calendar.update",
    "calendar.remove",
    "calendar.set-visible",
    "settings.set",
    "view.set",
    "view.go-to",
    "view.next",
    "view.previous",
    "view.today",
    "batch",
];

describe("the bus", () => {
    it("never throws on bad input", () => {
        const model = modelOf([allDay("a", "2026-11-24", "2026-11-25")]);
        const run = model.run as (command: string, payload: unknown) => unknown;
        for (const payload of [
            undefined,
            null,
            3,
            "x",
            [],
            { eventId: 3 },
            { eventId: "a", extra: 1 },
        ]) {
            for (const command of ALL_COMMANDS) {
                expect(() => run(command, payload)).not.toThrow();
            }
        }
        expect(run("event.fly", {})).toEqual({
            ok: false,
            error: {
                code: "unknown_command",
                message: 'unknown command "event.fly"',
            },
        });
        expect(run("event.remove", { eventId: "a", extra: 1 })).toMatchObject({
            error: {
                code: "invalid_payload",
                path: "/extra",
                message: "is not allowed",
            },
        });
    });

    it("keeps the state when nothing changed, and shares untouched events", () => {
        const model = modelOf([
            allDay("a", "2026-11-24", "2026-11-25"),
            allDay("b", "2026-11-24", "2026-11-25"),
        ]);
        const before = model.state;
        model.run("event.remove", { eventId: "none" });
        expect(model.state).toBe(before);
        model.run("event.move", { eventId: "a", delta: { days: 1 } });
        expect(model.state).not.toBe(before);
        expect(model.state.events[1]).toBe(before.events[1]);
        expect(model.state.calendars).toBe(before.calendars);
    });

    it("binds its verbs", () => {
        const model = modelOf();
        const { run, get } = model;
        expect(run("view.set", { type: "week" }).ok).toBe(true);
        expect(get("view").type).toBe("week");
    });

    it("refuses a transient step of a command that is not one", () => {
        const model = modelOf([allDay("a", "2026-11-24", "2026-11-25")]);
        expect(
            model.run("event.remove", { eventId: "a" }, { transient: true }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/transient" },
        });
    });
});

describe("batch", () => {
    it("applies all its commands as one step with one event", () => {
        const model = modelOf();
        const events: CommandEvent[] = [];
        model.subscribe((event) => events.push(event));
        const result = model.run("batch", {
            commands: [
                {
                    command: "calendar.add",
                    payload: { id: "work", title: "Work" },
                },
                {
                    command: "event.add",
                    payload: {
                        id: "a",
                        title: "a",
                        start: "2026-11-26",
                        allDay: true,
                        calendarId: "work",
                    },
                },
            ],
        });
        expect(result).toEqual({
            ok: true,
            value: { results: [{ calendarId: "work" }, { eventId: "a" }] },
        });
        expect(events).toHaveLength(1);
        expect(events[0]?.command).toBe("batch");
        expect(events[0]?.commands?.map((step) => step.command)).toEqual([
            "calendar.add",
            "event.add",
        ]);
    });

    it("applies none when one fails, at its path", () => {
        const model = modelOf();
        const before = model.state;
        const result = model.run("batch", {
            commands: [
                {
                    command: "calendar.add",
                    payload: { id: "work", title: "Work" },
                },
                { command: "event.remove", payload: { eventId: "none" } },
            ],
        });
        expect(result).toMatchObject({
            error: { code: "not_found", path: "/commands/1/payload/eventId" },
        });
        expect(model.state).toBe(before);
        expect(
            model.run("batch", {
                commands: [{ command: "nope", payload: {} }],
            } as never),
        ).toMatchObject({
            error: { code: "unknown_command", path: "/commands/0/command" },
        });
        expect(
            model.run("batch", {
                commands: [{ command: "batch", payload: { commands: [] } }],
            }),
        ).toMatchObject({
            error: { code: "refused", path: "/commands/0/command" },
        });
    });
});

describe("middleware", () => {
    it("vetoes", () => {
        const model = modelOf([allDay("keep", "2026-11-24", "2026-11-25")]);
        model.use((ctx, next) => {
            if (
                ctx.command === "event.remove" &&
                ctx.payload.eventId === "keep"
            ) {
                return veto("stays");
            }
            return next();
        });
        expect(model.run("event.remove", { eventId: "keep" })).toEqual({
            ok: false,
            error: { code: "vetoed", message: "stays" },
        });
        expect(model.can("event.remove", { eventId: "keep" })).toBe(false);
    });

    it("rewrites a payload, validated again", () => {
        const model = modelOf();
        const remove = model.use((ctx, next) => {
            if (ctx.command === "event.add")
                ctx.payload = { ...ctx.payload, title: "rewritten" };
            return next();
        });
        model.run("event.add", {
            id: "a",
            title: "a",
            start: "2026-11-26",
            allDay: true,
        });
        expect(model.get("event-by", { id: "a" })?.title).toBe("rewritten");
        remove();
        model.use((ctx, next) => {
            if (ctx.command === "event.add")
                ctx.payload = { ...ctx.payload, title: 3 } as never;
            return next();
        });
        expect(
            model.run("event.add", {
                title: "b",
                start: "2026-11-26",
                allDay: true,
            }),
        ).toMatchObject({
            error: {
                code: "invalid_payload",
                message: "rewritten by a middleware: must be a string",
            },
        });
    });

    it("sees dry runs, the command's own reads and its meta", () => {
        const model = modelOf([allDay("a", "2026-11-24", "2026-11-25")]);
        const seen: unknown[] = [];
        model.use((ctx, next) => {
            seen.push([
                ctx.command,
                ctx.dryRun,
                ctx.inBatch,
                ctx.meta,
                ctx.get("event-by", { id: "a" })?.id,
            ]);
            return next();
        });
        model.check("event.remove", { eventId: "a" });
        model.run(
            "event.remove",
            { eventId: "a" },
            { meta: { source: "test" } },
        );
        expect(seen).toEqual([
            ["event.remove", true, false, undefined, "a"],
            ["event.remove", false, false, { source: "test" }, "a"],
        ]);
        expect(model.get("events")).toEqual([]);
    });

    it("turns a throw into middleware_error", () => {
        const model = modelOf();
        model.use(() => {
            throw new Error("boom");
        });
        expect(model.run("view.today", {})).toEqual({
            ok: false,
            error: { code: "middleware_error", message: "boom" },
        });
    });

    it("queues a command issued while one runs", () => {
        const model = modelOf();
        let queued: unknown;
        model.use((ctx, next) => {
            if (ctx.command === "view.set") queued = model.run("view.next", {});
            return next();
        });
        model.run("view.set", { type: "week" });
        expect(queued).toMatchObject({ error: { code: "queued" } });
        // the next week starts on its first day (Sunday here)
        expect(model.get("view").anchorDate).toBe("2026-11-29");
    });
});

describe("subscribe and dispatch", () => {
    it("tells listeners each commit, with before and after, until removed", () => {
        const model = modelOf();
        const events: CommandEvent[] = [];
        const stop = model.subscribe((event) => events.push(event));
        const before = model.state;
        model.run("view.next", {}, { meta: { who: "me" } });
        model.check("view.next", {});
        stop();
        model.run("view.next", {});
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            command: "view.next",
            before,
            transient: false,
            meta: { who: "me" },
            result: { view: { anchorDate: "2026-12-01" } },
        });
    });

    it("validates untrusted JSON, and takes meta from the app only", () => {
        const model = modelOf([allDay("a", "2026-11-24", "2026-11-25")]);
        expect(model.dispatch("x")).toMatchObject({
            error: { code: "invalid_payload", path: "" },
        });
        expect(model.dispatch({ command: 1, payload: {} })).toMatchObject({
            error: { path: "/command" },
        });
        expect(model.dispatch({ command: "event.remove" })).toMatchObject({
            error: { path: "/payload" },
        });
        expect(
            model.dispatch({ command: "event.remove", payload: {}, meta: {} }),
        ).toMatchObject({
            error: { path: "/meta" },
        });
        expect(
            model.dispatch({
                command: "event.remove",
                payload: { eventId: 1 },
            }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/payload/eventId" },
        });
        const events: CommandEvent[] = [];
        model.subscribe((event) => events.push(event));
        expect(
            model.dispatch(
                { command: "event.remove", payload: { eventId: "a" } },
                { meta: { source: "ai" } },
            ).ok,
        ).toBe(true);
        expect(events[0]?.meta).toEqual({ source: "ai" });
    });
});

describe("the command list", () => {
    it("lists every command with its description and self-contained JSON Schemas", () => {
        const commands = modelOf().get("commands");
        expect(commands.map((command) => command.name)).toEqual(ALL_COMMANDS);
        for (const command of commands) {
            expect(command.description.length).toBeGreaterThan(20);
            expect(JSON.stringify(command.payloadSchema)).not.toContain("$ref");
            expect(command.resultSchema).toMatchObject({ type: "object" });
            expect(Object.isFrozen(command)).toBe(true);
        }
        expect(
            commands.find((command) => command.name === "batch")?.transient,
        ).toBe(true);
    });
});
