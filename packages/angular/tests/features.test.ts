// The features through their entries (D2): each feature's parts render only with their feature
// (and warn once without it), positioned from the layout; the root's feature directives emit their
// feature's events and warn without it; "+N more" renders while a day hides occurrences.
import { Component, input } from "@angular/core";
import { describe, expect, it, vi } from "vitest";
import {
    CalendarBusinessHoursDirective,
    constraints,
} from "../constraints/public-api";
import { CalendarExternalDropRootDirective } from "../external-drop/public-api";
import {
    CalendarNowIndicatorDirective,
    nowIndicator,
} from "../now-indicator/public-api";
import {
    CalendarSelectionRootDirective,
    selection,
} from "../selection/public-api";
import { CALENDAR, type CalendarModel } from "../src/public-api";
import { allDay, modelOf, TestCalendar, timed } from "./calendar";
import { flush, part, render } from "./interaction";

/** A week's columns with the now indicator and the business hours. */
@Component({
    imports: [
        CALENDAR,
        CalendarNowIndicatorDirective,
        CalendarBusinessHoursDirective,
    ],
    template: `
        <div [calendarRoot]="model()">
            <div calendarTimeGrid>
                <div calendarColumns>
                    <ng-template calendarColumnsItem let-column>
                        <div [calendarColumn]="column">
                            <div *calendarBusinessHours="let hours" [attr.data-start]="hours.range.start"></div>
                            <div *calendarNowIndicator="let now" [attr.data-time]="now.position.time"></div>
                        </div>
                    </ng-template>
                </div>
            </div>
        </div>
    `,
})
class Decorated {
    readonly model = input.required<CalendarModel>();
}

const week = { view: { type: "week" as const, anchorDate: "2026-11-26" } };

describe("the features' parts", () => {
    it("put the now indicator in today's column, at its fraction", async () => {
        const model = modelOf([], { ...week, features: [nowIndicator()] });
        const { container } = await render(Decorated, { model });
        const indicators = container.querySelectorAll(
            '[data-calendar-part="now-indicator"]',
        );
        expect(indicators).toHaveLength(1);
        const indicator = indicators[0] as HTMLElement;
        expect(
            indicator
                .closest('[data-calendar-part="column"]')
                ?.getAttribute("data-date"),
        ).toBe("2026-11-26");
        // 12:00 of a 24-hour column
        expect(indicator.style.top).toBe("50%");
        expect(indicator.getAttribute("aria-hidden")).toBe("true");
        expect(indicator.getAttribute("data-time")).toBe("12:00");
    });

    it("put each day's business hours in its column, at their fractions", async () => {
        const model = modelOf([], {
            ...week,
            features: [constraints()],
            settings: {
                businessHours: [
                    {
                        daysOfWeek: [1, 2, 3, 4, 5],
                        startTime: "09:00",
                        endTime: "17:00",
                    },
                ],
            },
        });
        const { container } = await render(Decorated, { model });
        const ranges = [
            ...container.querySelectorAll<HTMLElement>(
                '[data-calendar-part="business-hours"]',
            ),
        ];
        expect(ranges.map((range) => range.getAttribute("data-date"))).toEqual([
            "2026-11-23",
            "2026-11-24",
            "2026-11-25",
            "2026-11-26",
            "2026-11-27",
        ]);
        expect(ranges[0]?.style.top).toBe("37.5%");
        expect(Number.parseFloat(ranges[0]?.style.height ?? "")).toBeCloseTo(
            (8 / 24) * 100,
        );
        expect(ranges[0]?.getAttribute("aria-hidden")).toBe("true");
    });

    it("render nothing without their feature, and warn once", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const model = modelOf([timed("t", "09:00", "10:00")], week);
        const { container } = await render(Decorated, { model });
        await render(TestCalendar, { model, features: true });
        for (const name of [
            "now-indicator",
            "business-hours",
            "selection",
            "resize-handle",
        ]) {
            expect(
                container.querySelector(`[data-calendar-part="${name}"]`),
                name,
            ).toBeNull();
        }
        const messages = warn.mock.calls.map(([message]) => String(message));
        for (const feature of [
            "now-indicator",
            "constraints",
            "selection",
            "resize",
        ]) {
            expect(
                messages.filter((message) =>
                    message.includes(`needs the ${feature} feature`),
                ),
                feature,
            ).toHaveLength(1);
        }
        warn.mockRestore();
    });

    it("show the selected range where it is: a row's segment in a month", async () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
            features: [selection()],
        });
        const { container } = await render(TestCalendar, {
            model,
            features: true,
        });
        model.run("selection.set", {
            start: "2026-11-24",
            end: "2026-11-26",
            allDay: true,
        });
        await flush();
        const highlights = [
            ...container.querySelectorAll<HTMLElement>(
                '[data-calendar-part="selection"]',
            ),
        ];
        expect(highlights).toHaveLength(1);
        expect(
            highlights[0]?.closest('[data-calendar-part="week"]'),
        ).not.toBeNull();
        expect(highlights[0]?.style.position).toBe("absolute");
        // two of the row's seven days
        expect(highlights[0]?.style.inlineSize).toMatch(/0\.2857/);
        expect(
            part(container, "day", { "data-date": "2026-11-24" }).getAttribute(
                "aria-selected",
            ),
        ).toBe("true");
    });

    it("render a day's +N more while it hides occurrences, a button outside the roving focus", async () => {
        const model = modelOf(
            [
                allDay("a", "2026-11-26", "2026-11-27"),
                allDay("b", "2026-11-26", "2026-11-27"),
                allDay("c", "2026-11-26", "2026-11-27"),
            ],
            {
                view: { type: "month", anchorDate: "2026-11-26" },
                settings: { dayMaxEvents: 1 },
            },
        );
        const { container } = await render(TestCalendar, { model });
        const more = container.querySelectorAll<HTMLButtonElement>(
            '[data-calendar-part="more"]',
        );
        expect(more).toHaveLength(1);
        expect(more[0]?.getAttribute("data-date")).toBe("2026-11-26");
        expect(more[0]?.type).toBe("button");
        expect(more[0]?.getAttribute("tabindex")).toBe("-1");
        model.run("settings.set", { settings: { dayMaxEvents: null } });
        await flush();
        expect(
            container.querySelector('[data-calendar-part="more"]'),
        ).toBeNull();
    });
});

describe("the root's feature directives", () => {
    it("warn once when their feature is not installed", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        @Component({
            imports: [
                CALENDAR,
                CalendarSelectionRootDirective,
                CalendarExternalDropRootDirective,
            ],
            template: `<div [calendarRoot]="model" calendarSelection calendarExternalDrop></div>`,
        })
        class Missing {
            readonly model = modelOf([], week);
        }
        await render(Missing);
        const messages = warn.mock.calls.map(([message]) => String(message));
        expect(
            messages.filter((message) =>
                message.includes("(rangeSelect) needs"),
            ),
        ).toHaveLength(1);
        expect(
            messages.filter((message) =>
                message.includes("(externalDrop) needs"),
            ),
        ).toHaveLength(1);
        warn.mockRestore();
    });
});
