import { describe, expect, it } from "vitest";
import { formatPlainTime } from "../../src/time/format-plain-time";
import { minutesOfDay } from "../../src/time/minutes-of-day";
import { parsePlainTime } from "../../src/time/parse-plain-time";

describe("HH:mm", () => {
    it("round-trips, 24:00 included as the end of a day", () => {
        for (const text of ["00:00", "09:30", "23:59", "24:00"]) {
            const result = parsePlainTime(text);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(formatPlainTime(result.value)).toBe(text);
            }
        }
    });

    it("gives the minutes since midnight", () => {
        expect(minutesOfDay({ hour: 9, minute: 30 })).toBe(570);
        expect(minutesOfDay({ hour: 24, minute: 0 })).toBe(1440);
    });

    it("accepts a PlainTime object", () => {
        expect(parsePlainTime({ hour: 7, minute: 5 })).toEqual({
            ok: true,
            value: { hour: 7, minute: 5 },
        });
    });

    it("returns an issue for anything else, never throws", () => {
        for (const value of [
            "9:30",
            "09:30:00",
            "24:01",
            "25:00",
            "12:60",
            "-1:00",
            "",
            { hour: 1.5, minute: 0 },
            { hour: 24, minute: 30 },
            null,
            570,
        ]) {
            const result = parsePlainTime(value, "/settings/slotMinTime");
            expect(result.ok, JSON.stringify(value)).toBe(false);
            if (!result.ok) {
                expect(result.issues[0]?.path).toBe("/settings/slotMinTime");
            }
        }
    });
});
