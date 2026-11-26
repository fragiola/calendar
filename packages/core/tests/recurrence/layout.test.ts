// Occurrences in the views (D6, D11, D15): the layout reads a series through the occurrences
// contribution point, expanded over the visible days only; a weekly 09:00 series stays at 09:00
// on New York's wall clock across both DST changes; unchanged series keep their objects.
import { describe, expect, it } from "vitest";
import { createCalendarModel } from "../../src/index";
import { recurrence } from "../../src/recurrence/index";
import { allDay, documentOf } from "../fixture";
import {
    NEW_YORK,
    recurringModel,
    series,
    wallStarts,
} from "./recurrence-fixture";

describe("a weekly 09:00 series across DST in America/New_York", () => {
    it("stays at 09:00 on the wall clock, its instants an hour apart", () => {
        const model = recurringModel([
            series("w", "2026-10-26", "FREQ=WEEKLY;BYDAY=MO"),
        ]);
        expect(wallStarts(model, "2026-10-26", "2026-11-10")).toEqual([
            "2026-10-26 09:00",
            "2026-11-02 09:00",
            "2026-11-09 09:00",
        ]);
        expect(
            model
                .get("occurrences-in", {
                    range: { start: "2027-03-08", end: "2027-03-23" },
                })
                .map((o) => o.start),
        ).toEqual([
            "2027-03-08T09:00:00-05:00",
            "2027-03-15T09:00:00-04:00",
            "2027-03-22T09:00:00-04:00",
        ]);
    });

    it("sits on the same slot of the time grid on both sides of the change", () => {
        const model = recurringModel([
            series("w", "2026-10-26", "FREQ=WEEKLY;BYDAY=MO"),
        ]);
        model.run("view.go-to", { date: "2026-10-26" });
        model.run("view.set", { type: "week" });
        const before = model
            .get("time-grid")
            ?.columns.find((column) => column.segments.length > 0);
        model.run("view.next", {});
        const after = model
            .get("time-grid")
            ?.columns.find((column) => column.segments.length > 0);
        expect(before?.date).toBe("2026-10-26");
        expect(after?.date).toBe("2026-11-02");
        expect(after?.segments[0]?.top).toBe(before?.segments[0]?.top);
        expect(after?.segments[0]?.occurrenceId).toBe(
            "w@2026-11-02T09:00:00-05:00",
        );
    });

    it("keeps the wall clock of its own zone when the display zone differs", () => {
        const model = recurringModel(
            [series("w", "2026-10-26", "FREQ=WEEKLY;COUNT=2")],
            {
                timeZone: "UTC",
            },
        );
        expect(
            model
                .get("occurrences-in", {
                    range: { start: "2026-10-25", end: "2026-11-10" },
                })
                .map((o) => o.start),
        ).toEqual(["2026-10-26T09:00:00-04:00", "2026-11-02T09:00:00-05:00"]);
    });
});

describe("occurrences in the views", () => {
    it("the month's day grid holds each occurrence, with its id", () => {
        const model = createCalendarModel(
            documentOf([
                allDay("b", "2026-11-03", "2026-11-04", {
                    recurrence: {
                        rule: "FREQ=WEEKLY",
                        exdates: ["2026-11-17"],
                    },
                }),
            ]),
            { features: [recurrence()], now: () => Date.UTC(2026, 10, 26, 12) },
        );
        const ids = model
            .get("day-grid")
            ?.weeks.flatMap((week) =>
                week.segments.map((segment) => segment.occurrenceId),
            );
        // the six weeks shown, 2026-11-01 to 2026-12-12, its excluded date left out
        expect(ids).toEqual([
            "b@2026-11-03",
            "b@2026-11-10",
            "b@2026-11-24",
            "b@2026-12-01",
            "b@2026-12-08",
        ]);
        expect(
            model.get("event-attributes-by", { occurrenceId: "b@2026-11-10" }),
        ).toMatchObject({
            "data-event-id": "b",
            "data-occurrence-id": "b@2026-11-10",
        });
        expect(
            model.get("occurrence-by", { id: "b@2027-06-01" }),
        ).toMatchObject({ start: "2027-06-01" });
        expect(
            model.get("occurrence-by", { id: "b@2026-11-17" }),
        ).toBeUndefined();
    });

    it("shows an overridden occurrence where it moved to, even from outside the window", () => {
        const model = recurringModel([
            series("w", "2026-11-02", "FREQ=WEEKLY", {
                recurrence: {
                    rule: "FREQ=WEEKLY",
                    overrides: {
                        "2026-11-30T09:00:00-05:00": {
                            start: "2026-11-27T15:00:00-05:00",
                            end: "2026-11-27T16:00:00-05:00",
                        },
                    },
                },
            }),
        ]);
        expect(
            model
                .get("occurrences-in", {
                    range: { start: "2026-11-22", end: "2026-11-29" },
                })
                .map((o) => [o.occurrenceId, o.start]),
        ).toEqual([
            ["w@2026-11-23T09:00:00-05:00", "2026-11-23T09:00:00-05:00"],
            ["w@2026-11-30T09:00:00-05:00", "2026-11-27T15:00:00-05:00"],
        ]);
    });

    it("keeps an unchanged series' rows when another event changes", () => {
        const model = recurringModel([
            series("w", "2026-11-02", "FREQ=WEEKLY"),
            {
                id: "x",
                title: "x",
                start: "2026-11-03T12:00:00-05:00",
                end: "2026-11-03T13:00:00-05:00",
                allDay: false,
                timeZone: NEW_YORK,
            },
        ]);
        const before = model.get("day-grid");
        model.run("event.update", { eventId: "x", title: "renamed" });
        const after = model.get("day-grid");
        const first = before?.weeks.findIndex((week) =>
            week.segments.some((segment) => segment.eventId === "w"),
        );
        expect(first).toBeGreaterThanOrEqual(0);
        // the weeks without x are the same objects
        const untouched = before?.weeks.filter(
            (week) => !week.segments.some((s) => s.eventId === "x"),
        );
        for (const week of untouched ?? []) {
            expect(after?.weeks).toContain(week);
        }
    });

    it("expands an endless series only over the days asked for", () => {
        const model = recurringModel([series("d", "2026-11-02", "FREQ=DAILY")]);
        expect(
            model.get("occurrences-in", {
                range: { start: "9999-12-29", end: "9999-12-31" },
            }),
        ).toHaveLength(2);
        // the month view shows 2026-11-01 to 2026-12-12: 41 days from the start
        expect(model.get("occurrences")).toHaveLength(41);
    });
});
