// What the review found: the bus never throws on a payload its schema lets through (instants past
// the years a date-time can be written in), a middleware's change in place is validated again,
// a dry run and the run after it draw the same ids, removing a calendar with its events keeps
// their rules, and a calendar opens inside its validRange.
import { describe, expect, it } from "vitest";
import { createCalendarModel } from "../../src/index";
import { allDay, documentOf, modelOf, NOW, timed } from "../fixture";

describe("limits", () => {
    it("refuses a move or an add past the years 0000–9999 instead of throwing", () => {
        const model = modelOf([timed("a", "09:00", "10:00")]);
        expect(
            model.run("event.move", { eventId: "a", delta: { days: 1e12 } }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/delta/days" },
        });
        expect(
            model.run("event.move", {
                eventId: "a",
                delta: { minutes: 5_000_000_000 },
            }),
        ).toMatchObject({
            error: { code: "invalid_payload" },
        });
        expect(
            model.run("event.move", {
                eventId: "a",
                start: "9999-12-31T23:30:00Z",
            }),
        ).toMatchObject({
            error: { code: "invalid_payload" },
        });
        expect(
            model.run("event.add", {
                title: "x",
                start: "9999-12-31T23:30:00Z",
                allDay: false,
            }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/start" },
        });
    });

    it("refuses to step the view past the year 9999", () => {
        const model = modelOf();
        expect(model.run("view.go-to", { date: "9999-12-31" }).ok).toBe(true);
        expect(model.run("view.next", {})).toMatchObject({
            error: { code: "refused" },
        });
        expect(
            model.run("view.go-to", {
                date: { year: 10_000, month: 1, day: 1 },
            }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/date" },
        });
    });
});

describe("middleware changing a payload in place", () => {
    it("is validated again", () => {
        const model = modelOf([timed("a", "09:00", "10:00")]);
        model.use((ctx, next) => {
            if (ctx.command === "event.move" && "delta" in ctx.payload) {
                (ctx.payload as { delta: unknown }).delta = { days: "x" };
            }
            return next();
        });
        expect(
            model.run("event.move", { eventId: "a", delta: { days: 1 } }),
        ).toMatchObject({
            error: {
                code: "invalid_payload",
                message: "rewritten by a middleware: must be an integer",
            },
        });
    });
});

describe("ids and dry runs", () => {
    it("gives the run the ids its check named, with a custom createId", () => {
        let n = 0;
        const model = createCalendarModel(documentOf(), {
            now: () => NOW,
            createId: () => `e${++n}`,
        });
        const payload = { title: "x", start: "2026-11-26", allDay: true };
        expect(model.check("event.add", payload)).toEqual({
            ok: true,
            value: { eventId: "e1" },
        });
        expect(model.check("event.add", payload)).toEqual({
            ok: true,
            value: { eventId: "e1" },
        });
        expect(model.run("event.add", payload)).toEqual({
            ok: true,
            value: { eventId: "e1" },
        });
        expect(model.run("event.add", payload)).toEqual({
            ok: true,
            value: { eventId: "e2" },
        });
    });
});

describe("calendar.remove with its events", () => {
    it("refuses when one of them may not be removed", () => {
        const model = modelOf(
            [
                allDay("kept", "2026-11-24", "2026-11-25", {
                    calendarId: "work",
                    deletable: false,
                }),
            ],
            {},
            { calendars: [{ id: "work", title: "Work" }] },
        );
        expect(
            model.run("calendar.remove", {
                calendarId: "work",
                events: "remove",
            }),
        ).toMatchObject({
            error: { code: "refused", path: "/events" },
        });
        expect(
            model.run("calendar.remove", { calendarId: "work", events: "keep" })
                .ok,
        ).toBe(true);
    });
});

describe("the initial view and validRange", () => {
    it("opens inside validRange when today is outside it", () => {
        expect(
            modelOf([], { validRange: { start: "2027-03-01" } }).get("view")
                .anchorDate,
        ).toBe("2027-03-01");
        expect(
            modelOf([], { validRange: { end: "2026-01-01" } }).get("view")
                .anchorDate,
        ).toBe("2025-12-31");
        expect(
            modelOf([], { validRange: { start: "2026-01-01" } }).get("view")
                .anchorDate,
        ).toBe("2026-11-26");
    });
});
