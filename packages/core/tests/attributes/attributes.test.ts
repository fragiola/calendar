// Part attributes (D17), from the state alone: positions as `data-date`, ids on events, boolean
// state present (`""`) or absent (`undefined`), the view on the root, and the features' additions.
import { describe, expect, it } from "vitest";
import { defineFeature } from "../../src/index";
import { allDay, modelOf, timed } from "../fixture";

const month = { view: { type: "month" as const, anchorDate: "2026-11-26" } };

describe("part attributes", () => {
    it("gives a day its date and state", () => {
        const model = modelOf([], { validRange: { end: "2026-12-01" } }, month);
        expect(model.get("day-attributes-by", { date: "2026-11-26" })).toEqual({
            "data-date": "2026-11-26",
            "data-today": "",
            "data-outside": undefined,
            "data-weekend": undefined,
            "data-past": undefined,
            "data-disabled": undefined,
        });
        expect(
            model.get("day-attributes-by", { date: "2026-12-05" }),
        ).toMatchObject({
            "data-outside": "",
            "data-weekend": "",
            "data-disabled": "",
            "data-today": undefined,
        });
        expect(
            model.get("day-attributes-by", { date: "nope" }),
        ).toBeUndefined();
    });

    it("gives an occurrence its ids and state, a segment's continuation included", () => {
        const model = modelOf(
            [
                allDay("a", "2026-11-24", "2026-11-26", { calendarId: "work" }),
                timed("t", "09:00", "10:00"),
            ],
            {},
            { ...month, calendars: [{ id: "work", title: "Work" }] },
        );
        expect(
            model.get("event-attributes-by", {
                occurrenceId: "a",
                continuesAfter: true,
            }),
        ).toEqual({
            "data-event-id": "a",
            "data-occurrence-id": "a",
            "data-calendar-id": "work",
            "data-all-day": "",
            "data-continues-before": undefined,
            "data-continues-after": "",
        });
        expect(
            model.get("event-attributes-by", { occurrenceId: "t" }),
        ).toMatchObject({
            "data-all-day": undefined,
            "data-calendar-id": undefined,
        });
        expect(
            model.get("event-attributes-by", { occurrenceId: "none" }),
        ).toBeUndefined();
        expect(model.get("occurrence-by", { id: "t" })).toMatchObject({
            eventId: "t",
            allDay: false,
        });
    });

    it("gives the root its view, and merges what the features add", () => {
        const marker = defineFeature({
            name: "constraints",
            rootAttributes: () => ({ "data-constrained": "" }),
            dayAttributes: (_state, date) =>
                date === "2026-11-26"
                    ? { "data-business-hours": "" }
                    : undefined,
            eventAttributes: () => ({ "aria-disabled": "true" }),
        });
        const model = modelOf(
            [allDay("a", "2026-11-24", "2026-11-26")],
            {},
            month,
            { features: [marker] },
        );
        expect(model.get("root-attributes")).toEqual({
            "data-view": "month",
            "data-constrained": "",
        });
        expect(
            model.get("day-attributes-by", { date: "2026-11-26" })?.[
                "data-business-hours"
            ],
        ).toBe("");
        expect(
            model.get("day-attributes-by", { date: "2026-11-25" })?.[
                "data-business-hours"
            ],
        ).toBeUndefined();
        expect(
            model.get("event-attributes-by", { occurrenceId: "a" })?.[
                "aria-disabled"
            ],
        ).toBe("true");
        expect(modelOf([], {}, month).get("root-attributes")).toEqual({
            "data-view": "month",
        });
    });
});
