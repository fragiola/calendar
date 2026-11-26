// The list layout (D11): the view's days that hold occurrences, each in `eventOrder`, a multi-day
// occurrence on each of its days, empty days left out, `is("list-empty")` when none is left.
import { describe, expect, it } from "vitest";
import { allDay, modelOf, timed } from "../fixture";

const list = (duration?: number) => ({
    view: {
        type: "list" as const,
        anchorDate: "2026-11-26",
        ...(duration ? { duration } : {}),
    },
});

describe("the list", () => {
    it("lists the days holding occurrences, each one's in order", () => {
        const model = modelOf(
            [
                timed("late", "15:00", "16:00"),
                allDay("trip", "2026-11-25", "2026-11-28"),
                timed("early", "08:00", "09:00"),
            ],
            {},
            list(7),
        );
        const days = model.get("list").days;
        expect(
            days.map((day) => [
                day.date,
                day.items.map((item) => item.occurrenceId),
            ]),
        ).toEqual([
            ["2026-11-26", ["trip", "early", "late"]],
            ["2026-11-27", ["trip"]],
        ]);
        expect(days[0]?.today).toBe(true);
        expect(days[0]?.items[0]).toEqual({
            eventId: "trip",
            occurrenceId: "trip",
            allDay: true,
            // it started on the 25th, before the list
            continuesBefore: true,
            continuesAfter: true,
        });
        expect(days[1]?.items[0]).toMatchObject({
            continuesBefore: true,
            continuesAfter: false,
        });
        expect(model.is("list-empty")).toBe(false);
    });

    it("is empty when no day holds an occurrence", () => {
        const model = modelOf(
            [allDay("far", "2027-02-01", "2027-02-02")],
            {},
            list(),
        );
        expect(model.get("list").days).toEqual([]);
        expect(model.is("list-empty")).toBe(true);
    });

    it("keeps the days a change did not touch", () => {
        const model = modelOf(
            [
                allDay("a", "2026-11-03", "2026-11-04"),
                allDay("b", "2026-11-10", "2026-11-11"),
            ],
            {},
            list(),
        );
        const before = model.get("list");
        model.run("event.update", { eventId: "b", title: "B" });
        const after = model.get("list");
        expect(after.days[0]).toBe(before.days[0]);
        // the same ids, but its event changed: a new day, for the adapter to render its title
        expect(after.days[1]).not.toBe(before.days[1]);
        expect(after.days[1]).toEqual(before.days[1]);
    });
});
