// Views and navigation (D7): each view's ranges (a month view shows six weeks and is about its
// month), the view's own step for `next` / `previous`, hidden days skipped, `validRange` refusing
// navigation, `today` from the injected clock (D16). FullCalendar's documented view ranges as the
// behaviour reference.
import { describe, expect, it } from "vitest";
import type { CalendarSettingsJson, ViewJson } from "../../src/index";
import { modelOf } from "../fixture";

function viewModel(
    view: Partial<ViewJson> & Pick<ViewJson, "type">,
    settings: CalendarSettingsJson = {},
) {
    return modelOf([], settings, {
        view: { anchorDate: "2026-11-26", ...view } as ViewJson,
    });
}

const ranges = (model: ReturnType<typeof viewModel>) => ({
    current: model.get("current-range"),
    visible: model.get("visible-range"),
});

describe("the ranges of each view", () => {
    it("shows six weeks in a month view, about the month", () => {
        expect(ranges(viewModel({ type: "month" }))).toEqual({
            current: { start: "2026-11-01", end: "2026-12-01" },
            visible: { start: "2026-11-01", end: "2026-12-13" },
        });
    });

    it("shows the month's weeks only without fixedWeekCount", () => {
        const model = viewModel(
            { type: "month", anchorDate: "2027-02-10" },
            { fixedWeekCount: false },
        );
        // February 2027 starts on a Monday: 2027-01-31 to 2027-03-06, five weeks
        expect(model.get("visible-range")).toEqual({
            start: "2027-01-31",
            end: "2027-03-07",
        });
        expect(model.get("day-grid")?.weeks).toHaveLength(5);
        expect(
            viewModel({ type: "month", anchorDate: "2027-02-10" }).get(
                "day-grid",
            )?.weeks,
        ).toHaveLength(6);
    });

    it("starts weeks on firstDayOfWeek, else the locale's first day", () => {
        expect(
            viewModel({ type: "week" }, { firstDayOfWeek: 1 }).get(
                "visible-range",
            ),
        ).toEqual({
            start: "2026-11-23",
            end: "2026-11-30",
        });
        const locale = modelOf(
            [],
            { locale: "de-DE" },
            { view: { type: "week", anchorDate: "2026-11-26" } },
        );
        // the fixture sets Sunday; without it the German week starts on Monday
        locale.run("settings.set", { settings: { firstDayOfWeek: null } });
        expect(locale.get("visible-range").start).toBe("2026-11-23");
    });

    it("leaves hidden days off the edges of the visible range", () => {
        expect(
            viewModel({ type: "week" }, { hiddenDays: [0, 6] }).get(
                "visible-range",
            ),
        ).toEqual({
            start: "2026-11-23",
            end: "2026-11-28",
        });
        expect(
            viewModel({ type: "month" }, { hiddenDays: [0] }).get(
                "visible-range",
            ),
        ).toEqual({
            start: "2026-11-02",
            end: "2026-12-13",
        });
    });

    it("shows a day, skipping forward from a hidden one", () => {
        expect(
            viewModel(
                { type: "day", anchorDate: "2026-11-28" },
                { hiddenDays: [0, 6] },
            ).get("current-range"),
        ).toEqual({
            start: "2026-11-30",
            end: "2026-12-01",
        });
    });

    it("counts a days view's days without the hidden ones", () => {
        expect(
            viewModel({ type: "days", days: 3 }, { hiddenDays: [0, 6] }).get(
                "visible-range",
            ),
        ).toEqual({
            start: "2026-11-26",
            end: "2026-12-01",
        });
    });

    it("lists a duration from the anchor, or the anchor's month", () => {
        expect(
            viewModel({ type: "list", duration: 7 }).get("current-range"),
        ).toEqual({
            start: "2026-11-26",
            end: "2026-12-03",
        });
        expect(viewModel({ type: "list" }).get("current-range")).toEqual({
            start: "2026-11-01",
            end: "2026-12-01",
        });
    });
});

describe("next and previous", () => {
    const steps = (
        view: Partial<ViewJson> & Pick<ViewJson, "type">,
        settings: CalendarSettingsJson = {},
    ) => {
        const model = viewModel(view, settings);
        model.run("view.next", {});
        const next = model.get("current-range");
        model.run("view.previous", {});
        model.run("view.previous", {});
        return { next, previous: model.get("current-range") };
    };

    it("steps a month view by a month", () => {
        expect(steps({ type: "month", anchorDate: "2026-01-31" })).toEqual({
            next: { start: "2026-02-01", end: "2026-03-01" },
            previous: { start: "2025-12-01", end: "2026-01-01" },
        });
    });

    it("steps a week view by a week", () => {
        expect(steps({ type: "week" })).toEqual({
            next: { start: "2026-11-29", end: "2026-12-06" },
            previous: { start: "2026-11-15", end: "2026-11-22" },
        });
    });

    it("steps a day view by a day, skipping hidden days both ways", () => {
        expect(
            steps(
                { type: "day", anchorDate: "2026-11-27" },
                { hiddenDays: [0, 6] },
            ),
        ).toEqual({
            next: { start: "2026-11-30", end: "2026-12-01" },
            previous: { start: "2026-11-26", end: "2026-11-27" },
        });
    });

    it("steps a days view by its days", () => {
        expect(steps({ type: "days", days: 3 })).toEqual({
            next: { start: "2026-11-29", end: "2026-12-02" },
            previous: { start: "2026-11-23", end: "2026-11-26" },
        });
    });

    it("steps a days view by its days that are not hidden", () => {
        expect(
            steps({ type: "days", days: 3 }, { hiddenDays: [0, 6] }),
        ).toEqual({
            next: { start: "2026-12-01", end: "2026-12-04" },
            previous: { start: "2026-11-23", end: "2026-11-26" },
        });
    });

    it("steps a list by its duration, or by a month", () => {
        expect(steps({ type: "list", duration: 10 })).toEqual({
            next: { start: "2026-12-06", end: "2026-12-16" },
            previous: { start: "2026-11-16", end: "2026-11-26" },
        });
        expect(steps({ type: "list" }).next).toEqual({
            start: "2026-12-01",
            end: "2027-01-01",
        });
    });
});

describe("validRange", () => {
    const valid = { validRange: { start: "2026-11-01", end: "2027-01-01" } };

    it("refuses a step that would show only dates outside it", () => {
        const model = viewModel({ type: "month" }, valid);
        expect(model.run("view.next", {}).ok).toBe(true);
        const before = model.state;
        expect(model.run("view.next", {})).toEqual({
            ok: false,
            error: {
                code: "refused",
                message: "the view would show only dates outside validRange",
            },
        });
        expect(model.can("view.next", {})).toBe(false);
        expect(model.state).toBe(before);
        model.run("view.previous", {});
        expect(model.can("view.previous", {})).toBe(false);
    });

    it("refuses a go-to or a view.set whose shown days all leave it (a hidden anchor)", () => {
        const settings: CalendarSettingsJson = {
            hiddenDays: [5],
            validRange: { start: "2026-11-23", end: "2026-11-28" },
        };
        const model = viewModel(
            { type: "day", anchorDate: "2026-11-24" },
            settings,
        );
        // Friday 27 is hidden: the day view would show Saturday 28, outside the range
        expect(model.run("view.go-to", { date: "2026-11-27" })).toMatchObject({
            ok: false,
            error: { code: "refused" },
        });
        expect(model.get("view").anchorDate).toBe("2026-11-24");
        const set = viewModel(
            { type: "month", anchorDate: "2026-11-27" },
            settings,
        );
        expect(set.run("view.set", { type: "day" })).toMatchObject({
            ok: false,
            error: { code: "refused" },
        });
        expect(set.get("view").type).toBe("month");
        expect(set.run("view.set", { type: "week" })).toMatchObject({
            ok: true,
        });
    });

    it("refuses go-to and today outside it, and marks its days disabled", () => {
        const model = viewModel(
            { type: "month" },
            { validRange: { start: "2026-12-01" } },
        );
        expect(model.run("view.go-to", { date: "2026-11-30" })).toMatchObject({
            error: {
                code: "refused",
                path: "/date",
                message: "2026-11-30 is outside validRange",
            },
        });
        expect(model.run("view.today", {})).toMatchObject({
            error: { code: "refused" },
        });
        expect(model.is("date-disabled", { date: "2026-11-30" })).toBe(true);
        expect(model.is("date-disabled", { date: "2026-12-01" })).toBe(false);
        const days = model.get("day-grid")?.weeks[0]?.days;
        expect(days?.every((day) => day.disabled)).toBe(true);
    });
});

describe("view commands", () => {
    it("goes to a date given as a string or a plain date object (D5)", () => {
        const model = viewModel({ type: "month" });
        model.run("view.go-to", { date: { year: 2027, month: 3, day: 9 } });
        expect(model.get("view").anchorDate).toBe("2027-03-09");
        expect(model.run("view.go-to", { date: "2027-02-30" })).toMatchObject({
            error: { code: "invalid_payload", path: "/date" },
        });
    });

    it("comes back to today from the injected clock", () => {
        const model = viewModel({ type: "month", anchorDate: "2020-01-01" });
        expect(model.run("view.today", {})).toEqual({
            ok: true,
            value: { view: { type: "month", anchorDate: "2026-11-26" } },
        });
    });

    it("refuses today when the injected clock gives no instant, without throwing", () => {
        let clock = Date.UTC(2026, 10, 26, 12);
        const model = modelOf(
            [],
            {},
            { view: { type: "month", anchorDate: "2020-01-01" } },
            { now: () => clock },
        );
        for (const broken of [Number.NaN, Number.POSITIVE_INFINITY, 1e20]) {
            clock = broken;
            expect(() => model.run("view.today", {})).not.toThrow();
            expect(model.run("view.today", {})).toMatchObject({
                ok: false,
                error: { code: "refused" },
            });
        }
        expect(model.get("view").anchorDate).toBe("2020-01-01");
    });

    it("changes the type keeping the anchor, and refuses a days or duration that does not fit", () => {
        const model = viewModel({ type: "month", anchorDate: "2026-11-10" });
        expect(model.run("view.set", { type: "days", days: 4 })).toEqual({
            ok: true,
            value: {
                view: { type: "days", anchorDate: "2026-11-10", days: 4 },
            },
        });
        expect(model.run("view.set", { type: "days" })).toMatchObject({
            error: { path: "/days" },
        });
        expect(model.run("view.set", { type: "week", days: 2 })).toMatchObject({
            error: { path: "/days" },
        });
        expect(
            model.run("view.set", { type: "week", duration: 2 }),
        ).toMatchObject({ error: { path: "/duration" } });
        expect(model.run("view.set", { type: "days", days: 15 })).toMatchObject(
            { error: { path: "/days" } },
        );
        model.run("view.set", { type: "list", duration: 5 });
        expect(model.get("view")).toEqual({
            type: "list",
            anchorDate: "2026-11-10",
            duration: 5,
        });
    });
});
