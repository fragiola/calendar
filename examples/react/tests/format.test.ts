import { createCalendarModel } from "@fragiola/calendar-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dateTimeFormat, dayText, timesOf } from "../src/examples/_kit/format";

// The kit's text keeps its formatters (Epic #27): an event's times are formatted on every render
// of every event, so building an `Intl.DateTimeFormat` per call cost a drop a dozen of them. The
// Vue and Angular kits are this file's copies (their tests compare them).

afterEach(() => {
    vi.restoreAllMocks();
});

describe("dateTimeFormat", () => {
    it("keeps one formatter per locale and options", () => {
        const options = { hour: "numeric", minute: "2-digit" } as const;
        const first = dateTimeFormat("en-US", options);
        expect(dateTimeFormat("en-US", { ...options })).toBe(first);
        expect(dateTimeFormat("pt-BR", options)).not.toBe(first);
        expect(dateTimeFormat("en-US", { hour: "numeric" })).not.toBe(first);
        expect(first.format(Date.UTC(2026, 10, 26, 15, 5))).toBe(
            new Intl.DateTimeFormat("en-US", options).format(
                Date.UTC(2026, 10, 26, 15, 5),
            ),
        );
    });

    it("tells an undefined zone from a named one", () => {
        const local = dateTimeFormat("en-US", { hour: "numeric" });
        const utc = dateTimeFormat("en-US", {
            hour: "numeric",
            timeZone: "UTC",
        });
        expect(utc).not.toBe(local);
        expect(utc.resolvedOptions().timeZone).toBe("UTC");
    });
});

describe("the kit's text", () => {
    const model = createCalendarModel({
        version: 1,
        events: [
            {
                id: "standup",
                title: "Standup",
                start: "2026-11-26T09:00:00-05:00",
                end: "2026-11-26T09:30:00-05:00",
                allDay: false,
            },
        ],
        settings: { timeZone: "America/New_York" },
        view: { type: "week", anchorDate: "2026-11-26" },
    });
    const occurrenceId = () =>
        model.get("time-grid")?.columns.flatMap((column) => column.segments)[0]
            ?.occurrenceId ?? "";

    it("builds no formatter once it has formatted the same text", () => {
        const id = occurrenceId();
        expect(timesOf(model, id)).toMatch(/^9:00\s*–\s*9:30\sAM$/u);
        dayText("2026-11-26", "en-US");
        const built = vi.spyOn(Intl, "DateTimeFormat");
        for (let render = 0; render < 20; render++) {
            timesOf(model, id);
            dayText("2026-11-26", "en-US");
        }
        expect(built).not.toHaveBeenCalled();
    });
});
