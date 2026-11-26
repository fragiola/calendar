// Formatting is data (D4, D19): `Intl` parts, the same under every host zone, since a plain date
// and a time of day are formatted on their own and an instant in the zone given.
import { describe, expect, it } from "vitest";
import { formatDateParts } from "../../src/locale/format-date-parts";
import { formatDateRangeParts } from "../../src/locale/format-date-range-parts";
import { formatInstantParts } from "../../src/locale/format-instant-parts";
import { formatTimeParts } from "../../src/locale/format-time-parts";
import { validateLocale } from "../../src/locale/validate-locale";
import { at, date } from "../time/date-time-of";

const partValue = (parts: readonly Intl.DateTimeFormatPart[], type: string) =>
    parts.find((part) => part.type === type)?.value;

describe("Intl parts", () => {
    it("format a day header from a plain date, whatever the host zone", () => {
        const parts = formatDateParts(date("2026-11-26"), "en-US", {
            weekday: "short",
            day: "numeric",
        });
        expect(partValue(parts, "weekday")).toBe("Thu");
        expect(partValue(parts, "day")).toBe("26");
        const pt = formatDateParts(date("2026-01-01"), "pt-BR", {
            weekday: "long",
        });
        expect(partValue(pt, "weekday")).toBe("quinta-feira");
    });

    it("format a title from a range, its exclusive end left out", () => {
        const parts = formatDateRangeParts(
            { start: date("2026-11-22"), end: date("2026-11-29") },
            "en-US",
            { month: "short", day: "numeric", year: "numeric" },
        );
        expect(
            parts
                .filter((part) => part.type === "day")
                .map((part) => [part.value, part.source]),
        ).toEqual([
            ["22", "startRange"],
            ["28", "endRange"],
        ]);
        expect(partValue(parts, "month")).toBe("Nov");
        expect(partValue(parts, "year")).toBe("2026");
        const month = formatDateRangeParts(
            { start: date("2026-11-01"), end: date("2026-12-01") },
            "en-US",
            { month: "long", year: "numeric" },
        );
        expect(month.map((part) => part.value).join("")).toBe("November 2026");
    });

    it("format a slot label from a time of day, even one a DST gap skips", () => {
        const parts = formatTimeParts({ hour: 9, minute: 0 }, "en-US", {
            hour: "numeric",
            minute: "2-digit",
        });
        expect(partValue(parts, "hour")).toBe("9");
        expect(partValue(parts, "minute")).toBe("00");
        expect(partValue(parts, "dayPeriod")).toBe("AM");
        const gap = formatTimeParts({ hour: 2, minute: 30 }, "en-GB", {
            hour: "2-digit",
            minute: "2-digit",
        });
        expect(gap.map((part) => part.value).join("")).toBe("02:30");
    });

    it("format an instant on a zone's wall clock", () => {
        const parts = formatInstantParts(
            at("2026-11-26T12:30:00Z"),
            "America/Sao_Paulo",
            "en-GB",
            {
                hour: "2-digit",
                minute: "2-digit",
            },
        );
        expect(parts.map((part) => part.value).join("")).toBe("09:30");
    });
});

describe("locales", () => {
    it("validate to their canonical form; anything else is an issue", () => {
        expect(validateLocale("pt-br")).toEqual({ ok: true, value: "pt-BR" });
        expect(validateLocale("en-US")).toEqual({ ok: true, value: "en-US" });
        for (const value of ["", "not a locale", "en_US", null, 1]) {
            const result = validateLocale(value, "/settings/locale");
            expect(result.ok, String(value)).toBe(false);
            if (!result.ok) {
                expect(result.issues[0]?.path).toBe("/settings/locale");
            }
        }
    });
});
