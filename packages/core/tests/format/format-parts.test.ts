// Formatting as data (D4): the view's title, a day's header and a slot label as `Intl` parts in
// the settings' locale, the same objects while nothing they read changed.
import { describe, expect, it } from "vitest";
import { modelOf } from "../fixture";

/** The parts' text, Intl's narrow and thin spaces read as spaces. */
const text = (parts: readonly { value: string }[] | undefined) =>
    parts
        ?.map((part) => part.value)
        .join("")
        .replace(/[\u2009\u202f]/g, " ");

describe("title-parts", () => {
    it("names a month view's month, a week's days, a day", () => {
        const model = modelOf([], { locale: "en-US" });
        expect(text(model.get("title-parts"))).toBe("November 2026");
        model.run("view.set", { type: "week" });
        expect(text(model.get("title-parts"))).toBe("Nov 22 – 28, 2026");
        model.run("view.set", { type: "day" });
        expect(text(model.get("title-parts"))).toBe("November 26, 2026");
        model.run("view.set", { type: "days", days: 3 });
        expect(text(model.get("title-parts"))).toBe("Nov 26 – 28, 2026");
    });

    it("says which part is the start's and the end's, in the settings' locale", () => {
        const model = modelOf([], { locale: "pt-BR" });
        model.run("view.set", { type: "week" });
        const parts = model.get("title-parts");
        expect(text(parts)).toBe("22 – 28 de nov. de 2026");
        expect(parts.find((part) => part.source === "startRange")?.value).toBe(
            "22",
        );
        expect(parts.find((part) => part.source === "endRange")?.value).toBe(
            "28",
        );
    });

    it("takes the app's options, and keeps its object while nothing changed", () => {
        const model = modelOf([], { locale: "en-US" });
        expect(
            text(
                model.get("title-parts", {
                    format: { year: "numeric", month: "2-digit" },
                }),
            ),
        ).toBe("11/2026");
        expect(model.get("title-parts")).toBe(model.get("title-parts"));
        expect(Object.isFrozen(model.get("title-parts"))).toBe(true);
    });

    it("follows hidden days: a week without its weekend", () => {
        const model = modelOf([], { locale: "en-US", hiddenDays: [0, 6] });
        model.run("view.set", { type: "week" });
        expect(text(model.get("title-parts"))).toBe("Nov 23 – 27, 2026");
    });
});

describe("day-header-by", () => {
    it("names the weekday in a month view, the weekday and the day in a time grid", () => {
        const model = modelOf([], { locale: "en-US" });
        expect(text(model.get("day-header-by", { date: "2026-11-26" }))).toBe(
            "Thu",
        );
        model.run("view.set", { type: "week" });
        expect(text(model.get("day-header-by", { date: "2026-11-26" }))).toBe(
            "26 Thu",
        );
        expect(
            text(
                model.get("day-header-by", {
                    date: "2026-11-26",
                    format: { weekday: "long" },
                }),
            ),
        ).toBe("Thursday");
        expect(
            model.get("day-header-by", { date: "2026-02-30" }),
        ).toBeUndefined();
    });

    it("never moves a date with the host's zone", () => {
        const model = modelOf([], {
            locale: "en-US",
            timeZone: "Pacific/Kiritimati",
        });
        expect(
            text(
                model.get("day-header-by", {
                    date: "2026-11-26",
                    format: { day: "numeric" },
                }),
            ),
        ).toBe("26");
    });
});

describe("slot-label-by", () => {
    it("formats a slot's wall-clock time in the locale", () => {
        expect(
            text(
                modelOf([], { locale: "en-US" }).get("slot-label-by", {
                    time: "09:30",
                }),
            ),
        ).toBe("9:30 AM");
        expect(
            text(
                modelOf([], { locale: "pt-BR" }).get("slot-label-by", {
                    time: "13:00",
                }),
            ),
        ).toBe("13:00");
        const model = modelOf([], { locale: "en-US" });
        expect(
            text(
                model.get("slot-label-by", {
                    time: "13:00",
                    format: { hour: "numeric" },
                }),
            ),
        ).toBe("1 PM");
        expect(model.get("slot-label-by", { time: "24:00" })).toBeUndefined();
        expect(model.get("slot-label-by", { time: "9" })).toBeUndefined();
    });
});

describe("slot-attributes-by", () => {
    it("gives a slot its date and time", () => {
        const model = modelOf();
        expect(
            model.get("slot-attributes-by", {
                date: "2026-11-26",
                time: "09:30",
            }),
        ).toEqual({
            "data-date": "2026-11-26",
            "data-time": "09:30",
        });
        expect(
            model.get("slot-attributes-by", { date: "x", time: "09:30" }),
        ).toBeUndefined();
    });
});
