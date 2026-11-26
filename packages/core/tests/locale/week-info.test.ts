import { afterEach, describe, expect, it, vi } from "vitest";
import { isWeekend } from "../../src/locale/is-weekend";
import { ISO_WEEK, weekInfo } from "../../src/locale/week-info";
import { weekOfYear } from "../../src/locale/week-of-year";
import { date } from "../time/date-time-of";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("a locale's week", () => {
    it("comes from Intl.Locale, days numbered 0 = Sunday", () => {
        expect(weekInfo("en-US")).toEqual({
            firstDay: 0,
            weekend: [0, 6],
            minimalDays: 1,
        });
        expect(weekInfo("pt-BR")).toEqual({
            firstDay: 0,
            weekend: [0, 6],
            minimalDays: 1,
        });
        expect(weekInfo("en-GB")).toEqual({
            firstDay: 1,
            weekend: [0, 6],
            minimalDays: 4,
        });
        expect(weekInfo("de")).toEqual({
            firstDay: 1,
            weekend: [0, 6],
            minimalDays: 4,
        });
        expect(weekInfo("ar-EG")).toEqual({
            firstDay: 6,
            weekend: [5, 6],
            minimalDays: 1,
        });
        expect(weekInfo("he")).toEqual({
            firstDay: 0,
            weekend: [5, 6],
            minimalDays: 1,
        });
    });

    it("lets an explicit firstDayOfWeek win, keeping the locale's minimal days", () => {
        expect(weekInfo("en-US", { firstDayOfWeek: 1 })).toEqual({
            firstDay: 1,
            weekend: [0, 6],
            minimalDays: 1,
        });
        expect(weekInfo("en-GB", { firstDayOfWeek: 0 }).firstDay).toBe(0);
        expect(weekInfo("en-GB", { firstDayOfWeek: 1 })).toBe(
            weekInfo("en-GB"),
        );
    });

    it("numbers locale weeks: a Sunday is week 47 in the US and ISO week 46 (2013-11-17)", () => {
        expect(weekOfYear(date("2013-11-17"), weekInfo("en-US"))).toEqual({
            year: 2013,
            week: 47,
        });
        expect(weekOfYear(date("2013-11-23"), weekInfo("en-US"))).toEqual({
            year: 2013,
            week: 47,
        });
        expect(weekOfYear(date("2013-11-17"), weekInfo("en-GB"))).toEqual({
            year: 2013,
            week: 46,
        });
        // Saturday starts ar's weeks: 2013-11-23 begins week 48
        expect(weekOfYear(date("2013-11-23"), weekInfo("ar-EG"))).toEqual({
            year: 2013,
            week: 48,
        });
    });

    it("knows its weekend", () => {
        expect(isWeekend(date("2026-11-28"), weekInfo("en-US"))).toBe(true);
        expect(isWeekend(date("2026-11-27"), weekInfo("en-US"))).toBe(false);
        expect(isWeekend(date("2026-11-27"), weekInfo("ar-EG"))).toBe(true);
        expect(isWeekend(date("2026-11-29"), weekInfo("ar-EG"))).toBe(false);
    });

    it("takes minimalDays from the engine when it gives them", () => {
        vi.spyOn(Intl.Locale.prototype, "getWeekInfo" as never).mockReturnValue(
            {
                firstDay: 1,
                weekend: [6, 7],
                minimalDays: 1,
            } as never,
        );
        expect(weekInfo("en-AU")).toEqual({
            firstDay: 1,
            weekend: [0, 6],
            minimalDays: 1,
        });
    });

    it("falls back to the older weekInfo getter, then to ISO 8601, with no table", () => {
        const prototype = Intl.Locale.prototype as unknown as Record<
            string,
            unknown
        >;
        const descriptor = Object.getOwnPropertyDescriptor(
            prototype,
            "getWeekInfo",
        );
        try {
            Object.defineProperty(prototype, "getWeekInfo", {
                value: undefined,
                configurable: true,
            });
            Object.defineProperty(prototype, "weekInfo", {
                get: () => ({ firstDay: 7, weekend: [5, 6] }),
                configurable: true,
            });
            expect(weekInfo("fr-CA")).toEqual({
                firstDay: 0,
                weekend: [5, 6],
                minimalDays: 1,
            });
            Object.defineProperty(prototype, "weekInfo", {
                get: () => undefined,
                configurable: true,
            });
            expect(weekInfo("es-MX")).toBe(ISO_WEEK);
        } finally {
            delete prototype.weekInfo;
            if (descriptor) {
                Object.defineProperty(prototype, "getWeekInfo", descriptor);
            }
        }
    });
});
