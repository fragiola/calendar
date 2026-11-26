import { describe, expect, it } from "vitest";
import { formatInstant } from "../../src/time-zone/format-instant";
import { resolveTimeZone } from "../../src/time-zone/resolve-time-zone";
import { timeZoneOffset } from "../../src/time-zone/time-zone-offset";
import { validateTimeZone } from "../../src/time-zone/validate-time-zone";
import { at } from "../time/date-time-of";

describe("zone names", () => {
    it("run under the host zone Vitest forces (D4)", () => {
        expect(["UTC", "America/Sao_Paulo"]).toContain(process.env.TZ);
        expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
            process.env.TZ,
        );
    });

    it('resolve "local" to the host zone, and any other name to itself', () => {
        expect(resolveTimeZone("local")).toBe(process.env.TZ);
        expect(resolveTimeZone("Pacific/Apia")).toBe("Pacific/Apia");
    });

    it("never depend on the host zone for an explicit one", () => {
        expect(formatInstant(at("2026-11-26T12:30:00Z"), "Europe/London")).toBe(
            "2026-11-26T12:30:00Z",
        );
        expect(
            formatInstant(at("2026-11-26T12:30:00Z"), "America/New_York"),
        ).toBe("2026-11-26T07:30:00-05:00");
    });

    it('validate IANA names, UTC and "local"; anything else is an issue', () => {
        for (const zone of [
            "America/Sao_Paulo",
            "UTC",
            "Australia/Lord_Howe",
            "local",
        ]) {
            expect(validateTimeZone(zone)).toEqual({ ok: true, value: zone });
        }
        for (const value of [
            "Mars/Olympus_Mons",
            "",
            "America/SaoPaulo",
            null,
            3,
            {},
        ]) {
            const result = validateTimeZone(value, "/settings/timeZone");
            expect(result.ok, String(value)).toBe(false);
            if (!result.ok) {
                expect(result.issues[0]?.path).toBe("/settings/timeZone");
            }
        }
    });

    it("throw a RangeError from the math for an unknown zone (validate first)", () => {
        expect(() =>
            timeZoneOffset("Mars/Olympus_Mons", at("2026-11-26T12:30:00Z")),
        ).toThrow(RangeError);
    });
});
