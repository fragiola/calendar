// Memo parity with React's `MemoCall` and Vue's (D11, Issue #9): each collection template's view is
// a view of its own, its context the layout's objects, so moving an event renders again only the
// rows and columns whose objects changed; app state a template reads is never stale (the view
// that reads it renders again); a new template renders every row again with it.
import { Component, input, signal, untracked } from "@angular/core";
import { describe, expect, it } from "vitest";
import { CALENDAR, type CalendarModel } from "../src/public-api";
import { allDay, modelOf, timed } from "./calendar";
import { flush, render } from "./interaction";

/** Renders per entity (`week 2026-11-22`, `column 2026-11-26`): each time its view is checked again. */
function counter() {
    const counts = new Map<string, number>();
    return {
        seen: (id: string) => counts.set(id, (counts.get(id) ?? 0) + 1),
        ids: () => [...counts.keys()].sort(),
        reset: () => counts.clear(),
    };
}

@Component({
    imports: [CALENDAR],
    template: `
        <div [calendarRoot]="model()">
            @if (view() === "month") {
                <div calendarDayGrid>
                    @if (alternate()) {
                        <ng-template calendarWeeks let-week>
                            <div [calendarWeek]="week">{{ probe("week", week.id) }}</div>
                        </ng-template>
                    } @else {
                        <ng-template calendarWeeks let-week>
                            <div [calendarWeek]="week">
                                {{ probe("week", week.id) }}
                                <ng-template calendarDays let-day>
                                    <div [calendarDay]="day">
                                        <div calendarDayEvents>
                                            <ng-template calendarDayEventsItem let-segment>
                                                <div
                                                    [calendarSegment]="segment"
                                                    [attr.data-highlighted]="highlight() === segment.occurrenceId ? '' : null"
                                                ></div>
                                            </ng-template>
                                        </div>
                                    </div>
                                </ng-template>
                            </div>
                        </ng-template>
                    }
                </div>
            } @else {
                <div calendarTimeGrid>
                    <div calendarColumns>
                        <ng-template calendarColumnsItem let-column>
                            <div [calendarColumn]="column">
                                {{ probe("column", column.date) }}
                                <div calendarColumnEvents>
                                    <ng-template calendarColumnEventsItem let-segment>
                                        <div [calendarTimeEvent]="segment"></div>
                                    </ng-template>
                                </div>
                            </div>
                        </ng-template>
                    </div>
                </div>
            }
        </div>
    `,
})
class Counted {
    readonly model = input.required<CalendarModel>();
    readonly view = input<"month" | "week">("month");
    readonly onRender = input<(id: string) => void>();
    readonly highlight = signal<string | undefined>(undefined);
    readonly alternate = signal(false);

    /** tells that a view read its entity again; renders nothing */
    probe(kind: string, id: string): string {
        untracked(() => this.onRender()?.(`${kind} ${id}`));
        return "";
    }
}

describe("re-render cost", () => {
    it("moving an event renders again the month's rows it touches, and no other", async () => {
        const renders = counter();
        const model = modelOf(
            [
                allDay("a", "2026-11-24", "2026-11-25"),
                allDay("b", "2026-11-10", "2026-11-11"),
            ],
            { view: { type: "month", anchorDate: "2026-11-26" } },
        );
        await render(Counted, { model, onRender: renders.seen });
        expect(renders.ids()).toHaveLength(6);
        renders.reset();
        // within its row
        model.run("event.move", { eventId: "a", delta: { days: 1 } });
        await flush();
        expect(renders.ids()).toEqual(["week 2026-11-22"]);
        renders.reset();
        // to the next row: both rows
        model.run("event.move", { eventId: "a", delta: { days: 7 } });
        await flush();
        expect(renders.ids()).toEqual(["week 2026-11-22", "week 2026-11-29"]);
        renders.reset();
        // a change no row shows (a time grid's slots): every row stays the same object
        model.run("settings.set", { settings: { slotDuration: 15 } });
        await flush();
        expect(renders.ids()).toEqual([]);
    });

    it("moving a timed event renders again the columns it leaves and enters, and no other", async () => {
        const renders = counter();
        const model = modelOf([timed("t", "09:00", "10:00")], {
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        await render(Counted, { model, view: "week", onRender: renders.seen });
        expect(renders.ids()).toHaveLength(7);
        renders.reset();
        model.run("event.move", { eventId: "t", delta: { days: 1 } });
        await flush();
        expect(renders.ids()).toEqual([
            "column 2026-11-26",
            "column 2026-11-27",
        ]);
    });

    it("keeps a template current with the app's state it reads (never stale)", async () => {
        const model = modelOf([allDay("a", "2026-11-24", "2026-11-25")], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const { container, component } = await render(Counted, { model });
        const segment = () =>
            container.querySelector('[data-calendar-part="segment"]');
        expect(segment()?.hasAttribute("data-highlighted")).toBe(false);
        component.highlight.set("a");
        await flush();
        expect(segment()?.hasAttribute("data-highlighted")).toBe(true);
    });

    it("renders every row again with another template", async () => {
        const renders = counter();
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const { component } = await render(Counted, {
            model,
            onRender: renders.seen,
        });
        renders.reset();
        component.alternate.set(true);
        await flush();
        expect(renders.ids()).toHaveLength(6);
    });
});
