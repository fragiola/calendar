// The calendar (category) and settings commands (D8): a calendar's flags are its events' defaults,
// hiding one hides its events, removing one removes or keeps them; settings are patched, `null`
// removes an optional one, and nonsense or a feature's setting is refused.
import { describe, expect, it } from "vitest";
import { allDay, modelOf } from "../fixture";

const calendars = [{ id: "work", title: "Work" }];

describe("calendar commands", () => {
    it("adds, updates and shows or hides a calendar", () => {
        const model = modelOf(
            [allDay("a", "2026-11-24", "2026-11-25", { calendarId: "work" })],
            {},
            { calendars },
        );
        expect(
            model.run("calendar.add", {
                title: "Home",
                data: { color: "red" },
            }),
        ).toEqual({
            ok: true,
            value: { calendarId: "calendar-1" },
        });
        expect(
            model.run("calendar.add", { id: "work", title: "Again" }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/id" },
        });
        model.run("calendar.update", {
            calendarId: "work",
            title: "Job",
            editable: false,
        });
        expect(model.get("calendar-by", { id: "work" })).toMatchObject({
            title: "Job",
            editable: false,
        });
        expect(model.is("event-editable", { eventId: "a" })).toBe(false);
        model.run("calendar.update", { calendarId: "work", editable: null });
        expect(
            model.get("calendar-by", { id: "work" })?.editable,
        ).toBeUndefined();
        expect(model.get("occurrences")).toHaveLength(1);
        model.run("calendar.set-visible", {
            calendarId: "work",
            visible: false,
        });
        expect(model.is("calendar-visible", { calendarId: "work" })).toBe(
            false,
        );
        expect(model.get("occurrences")).toEqual([]);
        expect(
            model.run("calendar.set-visible", {
                calendarId: "none",
                visible: true,
            }),
        ).toMatchObject({
            error: { code: "not_found", path: "/calendarId" },
        });
    });

    it("removes a calendar with its events, or keeps them without it", () => {
        const events = [
            allDay("a", "2026-11-24", "2026-11-25", { calendarId: "work" }),
            allDay("b", "2026-11-24", "2026-11-25"),
        ];
        const removing = modelOf(events, {}, { calendars });
        expect(
            removing.run("calendar.remove", {
                calendarId: "work",
                events: "remove",
            }),
        ).toEqual({
            ok: true,
            value: { calendarId: "work", removedEventIds: ["a"] },
        });
        expect(removing.get("events").map((event) => event.id)).toEqual(["b"]);
        const keeping = modelOf(events, {}, { calendars });
        keeping.run("calendar.remove", { calendarId: "work", events: "keep" });
        expect(
            keeping.get("event-by", { id: "a" })?.calendarId,
        ).toBeUndefined();
        expect(keeping.get("calendars")).toEqual([]);
        expect(
            keeping.get("calendar-events-by", { calendarId: "work" }),
        ).toEqual([]);
    });
});

describe("settings.set", () => {
    it("patches settings, and null removes an optional one", () => {
        const model = modelOf([], { firstDayOfWeek: 1 });
        const result = model.run("settings.set", {
            settings: { slotDuration: 15, firstDayOfWeek: null },
        });
        expect(result.ok && result.value.settings.slotDuration).toBe(15);
        expect(model.get("settings").firstDayOfWeek).toBeUndefined();
        expect(model.get("settings").timeZone).toBe("UTC");
    });

    it("refuses nonsense with its path", () => {
        const model = modelOf();
        expect(
            model.run("settings.set", {
                settings: { slotMinTime: "20:00", slotMaxTime: "08:00" },
            }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/settings/slotMaxTime" },
        });
        expect(
            model.run("settings.set", {
                settings: { timeZone: "Atlantis/Capital" },
            }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/settings/timeZone" },
        });
        expect(
            model.run("settings.set", { settings: { locale: null } } as never),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/settings/locale" },
        });
        expect(
            model.run("settings.set", {
                settings: { businessHours: [] },
            } as never),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/settings/businessHours" },
        });
    });

    it("moves today with the display zone", () => {
        // 2026-11-26T12:00Z is already the 27th in Kiritimati (+14:00)
        const model = modelOf();
        model.run("settings.set", {
            settings: { timeZone: "Pacific/Kiritimati" },
        });
        expect(model.get("today")).toBe("2026-11-27");
        expect(model.is("date-today", { date: "2026-11-27" })).toBe(true);
    });
});
