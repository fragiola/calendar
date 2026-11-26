// The injection functions (React's hooks, the lower layer): the root's model and engine, the
// values as signals that follow the calendar (a signal or getter argument followed too), the
// enclosing part's state, the features' values from their entries, and a calendar ref read in a
// template.
import { Component, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";
import { injectSelection, selection } from "../selection/public-api";
import {
    CALENDAR,
    type CalendarModel,
    injectCalendar,
    injectCalendarRef,
    injectCalendarTitle,
    injectDay,
    injectDayGrid,
    injectDayHeader,
    injectListLayout,
    injectSegment,
    injectSlotLabel,
    injectTimeGrid,
} from "../src/public-api";
import { allDay, modelOf } from "./calendar";
import { flush, render } from "./interaction";

@Component({
    selector: "test-values",
    template: `<output>{{ text() }}</output>`,
})
class Values {
    readonly date = input("2026-11-26");
    readonly calendar = injectCalendar();
    readonly title = injectCalendarTitle({ month: "long", year: "numeric" });
    readonly header = injectDayHeader(() => this.date(), { weekday: "long" });
    readonly label = injectSlotLabel("09:30");
    readonly dayGrid = injectDayGrid();
    readonly timeGrid = injectTimeGrid();
    readonly list = injectListLayout();
    readonly selected = injectSelection();
    text(): string {
        const join = (parts: readonly { value: string }[]) =>
            parts.map((part) => part.value).join("");
        return [
            this.calendar.model().state.view.type,
            join(this.title()),
            join(this.header()),
            join(this.label()),
            this.dayGrid()?.weeks.length ?? "none",
            this.timeGrid() === null ? "no time grid" : "time grid",
            this.list().days.length,
            this.selected().range?.start ?? "no range",
        ].join(" | ");
    }
}

/** A segment's own content, reading its part through injection. */
@Component({
    selector: "test-content",
    template: `{{ day.state()?.day?.date }} {{ segment.state()?.eventId }}`,
})
class Content {
    readonly day = injectDay();
    readonly segment = injectSegment();
}

describe("the injection functions", () => {
    it("give the root's model and values as signals that follow the calendar", async () => {
        @Component({
            imports: [CALENDAR, Values],
            template: `<div [calendarRoot]="model"><test-values [date]="date()" /></div>`,
        })
        class Host {
            readonly model = modelOf(
                [allDay("a", "2026-11-26", "2026-11-27")],
                {
                    view: { type: "month", anchorDate: "2026-11-26" },
                    features: [selection()],
                },
            );
            readonly date = signal("2026-11-26");
        }
        const { container, component } = await render(Host);
        const text = () => container.querySelector("output")?.textContent;
        expect(text()).toBe(
            "month | November 2026 | Thursday | 9:30 AM | 6 | no time grid | 1 | no range",
        );
        component.date.set("2026-11-27");
        component.model.run("selection.set", {
            start: "2026-11-02",
            end: "2026-11-03",
            allDay: true,
        });
        component.model.run("view.set", { type: "week" });
        await flush();
        expect(text()).toBe(
            "week | November 2026 | Friday | 9:30 AM | 1 | time grid | 1 | 2026-11-02",
        );
    });

    it("give the enclosing part's state, and fail outside it", async () => {
        @Component({
            imports: [CALENDAR, Content],
            template: `
                <div [calendarRoot]="model">
                    <div calendarDayGrid>
                        <ng-template calendarWeeks let-week>
                            <div [calendarWeek]="week">
                                <ng-template calendarDays let-day>
                                    <div [calendarDay]="day">
                                        <div calendarDayEvents>
                                            <ng-template calendarDayEventsItem let-segment>
                                                <div [calendarSegment]="segment"><test-content /></div>
                                            </ng-template>
                                        </div>
                                    </div>
                                </ng-template>
                            </div>
                        </ng-template>
                    </div>
                </div>
            `,
        })
        class Host {
            readonly model: CalendarModel = modelOf(
                [allDay("a", "2026-11-26", "2026-11-27")],
                { view: { type: "month", anchorDate: "2026-11-26" } },
            );
        }
        const { container } = await render(Host);
        expect(
            container
                .querySelector('[data-calendar-part="segment"]')
                ?.textContent?.trim(),
        ).toBe("2026-11-26 a");
        @Component({ imports: [Content], template: `<test-content />` })
        class Outside {}
        expect(() => TestBed.createComponent(Outside)).toThrow(
            "injectDay must be used inside [calendarDay]",
        );
    });

    it("give a calendar ref its root's model while it lives, read in a template", async () => {
        @Component({
            imports: [CALENDAR],
            template: `
                <output>{{ calendar.current?.model?.state?.view?.type ?? "none" }}</output>
                @if (shown()) {
                    <div calendarRoot [calendarRef]="calendar" defaultView="week"></div>
                }
            `,
        })
        class Toolbar {
            readonly calendar = injectCalendarRef();
            readonly shown = signal(true);
        }
        const { container, component } = await render(Toolbar);
        const text = () => container.querySelector("output")?.textContent;
        expect(text()).toBe("week");
        component.shown.set(false);
        await flush();
        expect(text()).toBe("none");
    });
});
