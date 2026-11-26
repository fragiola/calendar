import { describe, expect, it } from "vitest";
import { addMinutes } from "../../src/time/add-minutes";
import { formatDateTime } from "../../src/time/format-date-time";
import { instant } from "../../src/time/instant";
import { minutesBetween } from "../../src/time/minutes-between";
import { parseDateTime } from "../../src/time/parse-date-time";
import { at } from "./date-time-of";

describe("RFC 3339 date-times", () => {
    it("parse to the instant and the offset they were written with", () => {
        expect(parseDateTime("2026-11-26T09:30:00-03:00")).toEqual({
            ok: true,
            value: { instant: Date.UTC(2026, 10, 26, 12, 30), offset: -180 },
        });
        expect(parseDateTime("2026-11-26T12:30:00Z")).toEqual({
            ok: true,
            value: { instant: Date.UTC(2026, 10, 26, 12, 30), offset: 0 },
        });
        expect(parseDateTime("2026-10-04T02:45:00+11:00")).toEqual({
            ok: true,
            value: { instant: Date.UTC(2026, 9, 3, 15, 45), offset: 660 },
        });
        expect(parseDateTime("1969-12-31T23:59:59.999Z")).toEqual({
            ok: true,
            value: { instant: -1, offset: 0 },
        });
    });

    it("truncate a fraction finer than milliseconds", () => {
        const result = parseDateTime("2026-11-26T12:30:00.123456789Z");
        expect(result.ok && result.value.instant).toBe(
            Date.UTC(2026, 10, 26, 12, 30, 0, 123),
        );
        const short = parseDateTime("2026-11-26T12:30:00.5Z");
        expect(short.ok && short.value.instant).toBe(
            Date.UTC(2026, 10, 26, 12, 30, 0, 500),
        );
    });

    it("round-trip at the offset they were written with", () => {
        for (const text of [
            "2026-11-26T09:30:00-03:00",
            "2026-11-26T12:30:00Z",
            "2026-03-08T03:30:00-04:00",
            "2026-10-04T02:45:00+11:00",
            "2026-10-04T01:59:59+10:30",
            "2011-12-31T00:00:00+14:00",
            "2026-11-26T09:30:00.250-03:00",
            "0000-01-01T00:00:00Z",
            "9999-12-31T23:59:59.999Z",
        ]) {
            const result = parseDateTime(text);
            expect(result.ok, text).toBe(true);
            if (result.ok) {
                expect(
                    formatDateTime(result.value.instant, result.value.offset),
                ).toBe(text);
            }
        }
    });

    it("print +00:00 and -00:00 as Z", () => {
        const plus = parseDateTime("2026-11-26T12:30:00+00:00");
        expect(
            plus.ok && formatDateTime(plus.value.instant, plus.value.offset),
        ).toBe("2026-11-26T12:30:00Z");
        const minus = parseDateTime("2026-11-26T12:30:00-00:00");
        expect(minus.ok && minus.value.offset).toBe(0);
    });

    it("return an issue at the field's path for anything else, never throw", () => {
        for (const value of [
            "2026-11-26T09:30:00",
            "2026-11-26",
            "2026-11-26T09:30-03:00",
            "2026-11-26 09:30:00-03:00",
            "2026-11-26t09:30:00z",
            "2026-11-26T09:30:00-0300",
            "2026-11-26T09:30:00-3:00",
            "2026-11-26T24:00:00Z",
            "2026-11-26T09:60:00Z",
            "2026-12-31T23:59:60Z",
            "2026-02-29T09:30:00Z",
            "2026-11-26T09:30:00+24:00",
            "2026-11-26T09:30:00.Z",
            "2026-11-26T09:30:00.1234567890Z",
            "Thu, 26 Nov 2026 09:30:00 GMT",
            "1764160200000",
            "",
            1_764_160_200_000,
            null,
            {},
        ]) {
            const result = parseDateTime(value, "/events/3/end");
            expect(result.ok, String(value)).toBe(false);
            if (!result.ok) {
                expect(result.issues).toEqual([
                    {
                        path: "/events/3/end",
                        message: expect.stringContaining("RFC 3339"),
                    },
                ]);
            }
        }
    });
});

describe("instants", () => {
    it("are integer epoch milliseconds", () => {
        expect(instant(0)).toBe(0);
        expect(() => instant(1.5)).toThrow(RangeError);
        expect(() => instant(Number.NaN)).toThrow(RangeError);
        expect(() => instant(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    });

    it("move by minutes exactly, whatever the wall clock does (D4)", () => {
        // 01:30 EDT + 60 minutes is 01:30 EST: the same wall clock, an hour later
        expect(
            formatDateTime(
                addMinutes(at("2026-11-01T01:30:00-04:00"), 60),
                -300,
            ),
        ).toBe("2026-11-01T01:30:00-05:00");
        expect(addMinutes(at("2026-03-08T01:30:00-05:00"), 30)).toBe(
            at("2026-03-08T03:00:00-04:00"),
        );
        expect(addMinutes(at("2026-11-26T09:30:00Z"), -90)).toBe(
            at("2026-11-26T08:00:00Z"),
        );
    });

    it("measure exact durations in minutes", () => {
        expect(
            minutesBetween(
                at("2026-03-08T00:00:00-05:00"),
                at("2026-03-09T00:00:00-04:00"),
            ),
        ).toBe(1380);
        expect(
            minutesBetween(
                at("2026-11-26T10:00:00Z"),
                at("2026-11-26T09:30:00Z"),
            ),
        ).toBe(-30);
    });

    it("refuse to print what RFC 3339 cannot write", () => {
        expect(() =>
            formatDateTime(instant(Date.UTC(10_000, 0, 1)), 0),
        ).toThrow(RangeError);
        expect(() => formatDateTime(instant(0), 0.5)).toThrow(RangeError);
    });
});
