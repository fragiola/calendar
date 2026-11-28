// Render-count budgets (Issue #25), as packages/react's and packages/vue's: the drag-and-resize
// example's week, counts the views Angular checks (a probe per template: a slot, a slot row, a
// column, an event, a preview, a header), the parts' attribute reads and the engine's
// `committed()` for 30 preview changes and for the drop. A preview change re-checks the previews,
// not the cells, and a part's computed reads again only when its revision moved (the engine's
// `affects`); the drop checks the columns the event left and entered; a render of the app that
// does not touch the calendar tells the engine nothing.
import { Component, input, signal, untracked } from "@angular/core";
import { fireEvent } from "@testing-library/dom";
import { describe, expect, it, vi } from "vitest";
import {
    CalendarDragAndDropRootDirective,
    CalendarDragPreviewDirective,
    dragAndDrop,
} from "../drag-and-drop/public-api";
import { CalendarResizeHandleDirective, resize } from "../resize/public-api";
import { CALENDAR, type CalendarModel } from "../src/public-api";
import { allDay, modelOf, timed } from "./calendar";
import { center, flush, render } from "./interaction";

// the parts' reads of their attributes (each a part's computed that ran again), and the engine's
// `committed()` (each after a render that touched the calendar)
const counted = vi.hoisted(() => ({ reads: 0, committed: 0 }));

vi.mock("@fragiola/calendar", async (original) => {
    const actual = await original<typeof import("@fragiola/calendar")>();
    return {
        ...actual,
        createCalendarEngine: (
            ...args: Parameters<typeof actual.createCalendarEngine>
        ) => {
            const engine = actual.createCalendarEngine(...args);
            // the engine's verbs are arrow functions: a copy with counted calls is the same engine
            const { attributes, committed } = engine.adapter;
            return {
                ...engine,
                adapter: {
                    ...engine.adapter,
                    attributes: (...call: Parameters<typeof attributes>) => {
                        counted.reads++;
                        return attributes(...call);
                    },
                    committed: () => {
                        counted.committed++;
                        committed();
                    },
                },
            };
        },
    };
});

/** A busy week (the example's team week): all-day events and timed ones on most days. */
function busyWeek() {
    return modelOf(
        [
            allDay("offsite", "2026-11-23", "2026-11-25"),
            allDay("launch", "2026-11-27", "2026-11-28"),
            timed("planning", "10:00", "11:30", "2026-11-23"),
            timed("design", "14:00", "15:00", "2026-11-24"),
            timed("one-on-one", "11:00", "11:30", "2026-11-24"),
            timed("interview", "09:30", "10:30", "2026-11-25"),
            timed("focus", "13:00", "16:00", "2026-11-25"),
            timed("lunch", "12:00", "13:00", "2026-11-26"),
            timed("demo", "15:00", "16:00", "2026-11-26"),
            timed("support", "09:00", "12:00", "2026-11-26"),
            timed("retro", "16:00", "17:00", "2026-11-27"),
        ],
        {
            view: { type: "week", anchorDate: "2026-11-26" },
            features: [dragAndDrop(), resize()],
        },
    );
}

/** The example's week, every template probed. */
@Component({
    imports: [
        CALENDAR,
        CalendarDragAndDropRootDirective,
        CalendarDragPreviewDirective,
        CalendarResizeHandleDirective,
    ],
    template: `
        <p>{{ probe("app") }}{{ status() }}</p>
        <div [calendarRoot]="model()" calendarDragAndDrop>
            <div calendarTimeGrid>
                <div calendarColumnHeaders>
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date">{{ probe("header") }}</div>
                    </ng-template>
                </div>
                <div calendarAllDayRow>
                    <ng-template calendarDays let-day>
                        <div [calendarDay]="day">
                            <div calendarDayEvents>
                                <ng-template calendarDayEventsItem let-segment>
                                    <div [calendarSegment]="segment">
                                        <div *calendarResizeHandle="'end'"></div>
                                    </div>
                                </ng-template>
                            </div>
                        </div>
                    </ng-template>
                    <div *calendarDragPreview>{{ probe("preview") }}</div>
                </div>
                <div calendarScroller>
                    <ng-template calendarSlotRows let-slot>
                        <div [calendarSlotRow]="slot">
                            {{ probe("slot-row") }}
                            <div calendarSlotLabel></div>
                            <ng-template calendarSlots let-column>
                                <div [calendarSlot]="column.date">{{ probe("slot") }}</div>
                            </ng-template>
                        </div>
                    </ng-template>
                    <div calendarColumns>
                        <ng-template calendarColumnsItem let-column>
                            <div [calendarColumn]="column">
                                {{ probe("column") }}
                                <div calendarColumnEvents>
                                    <ng-template calendarColumnEventsItem let-segment>
                                        <div [calendarTimeEvent]="segment">
                                            {{ probe("event") }}{{ segment.eventId }}{{ label() }}
                                            <div *calendarResizeHandle="'start'"></div>
                                            <div *calendarResizeHandle="'end'"></div>
                                        </div>
                                    </ng-template>
                                </div>
                                <div *calendarDragPreview>{{ probe("preview") }}</div>
                            </div>
                        </ng-template>
                    </div>
                </div>
            </div>
        </div>
    `,
})
class DragWeek {
    readonly model = input.required<CalendarModel>();
    readonly counts = input.required<Map<string, number>>();
    /** app state outside the calendar */
    readonly status = signal("");
    /** app state an event's template shows */
    readonly label = signal("");

    /** counts a check of the view it is in; renders nothing */
    probe(kind: string): string {
        untracked(() => {
            const counts = this.counts();
            counts.set(kind, (counts.get(kind) ?? 0) + 1);
        });
        return "";
    }
}

function total(counts: Map<string, number>): number {
    return [...counts.values()].reduce((sum, count) => sum + count, 0);
}

/** The week, and a pointer drag of an event in steps: its start, its moves and its drop. */
async function scene() {
    const model = busyWeek();
    const counts = new Map<string, number>();
    const rendered = await render(DragWeek, { model, counts });
    const planning = rendered.container.querySelector(
        '[data-calendar-part="time-event"][data-occurrence-id="planning"]',
    ) as HTMLElement;
    const start = center(planning);
    const init = (x: number, y: number, buttons: number) => ({
        pointerId: 7,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons,
        clientX: x,
        clientY: y,
        bubbles: true,
    });
    const move = async (x: number, y: number) => {
        fireEvent.pointerMove(planning, init(start.x + x, start.y + y, 1));
        await flush();
    };
    // two days on (Wednesday 10:00) in 30 moves, each half an hour up or down (a slot): a new
    // preview each
    const dx = 200;
    return {
        model,
        counts,
        component: rendered.component,
        /** the press and a first move, which starts the drag (half an hour earlier) */
        async begin() {
            fireEvent.pointerDown(planning, init(start.x, start.y, 1));
            await flush();
            await move(0, -30);
        },
        async moves() {
            for (let step = 1; step <= 30; step++) {
                await move((dx * step) / 30, (step % 2) * 30);
            }
        },
        async drop() {
            fireEvent.pointerUp(planning, init(start.x + dx, start.y, 0));
            await flush();
        },
        reset() {
            counts.clear();
            counted.reads = 0;
            counted.committed = 0;
        },
    };
}

describe("render counts (Issue #25)", () => {
    it("30 preview changes re-check the previews, not the grid", async () => {
        const { begin, moves, counts, reset } = await scene();
        await begin();
        reset();
        await moves();
        // the previews' views are made once and moved by their style: no template checked again
        expect(total(counts)).toBeLessThanOrEqual(10);
        expect(counts.get("slot")).toBeUndefined();
        expect(counts.get("event")).toBeUndefined();
        // the previews' attributes, one a move (15,150 before Issue #25: every part's computed)
        expect(counted.reads).toBeLessThanOrEqual(40);
        expect(counted.committed).toBe(30);
    });

    it("the drop checks the columns it touched", async () => {
        const { model, begin, moves, drop, counts, reset } = await scene();
        await begin();
        await moves();
        reset();
        await drop();
        expect(model.get("event-by", { id: "planning" })).toMatchObject({
            start: "2026-11-25T10:00:00Z",
        });
        // the two columns, their events, and the slot cells of the two days (each a view of its own,
        // as each is a call in React and Vue): 101 views
        expect(total(counts)).toBeLessThanOrEqual(110);
        expect(counts.get("column")).toBe(2);
        expect(counts.get("slot")).toBeLessThanOrEqual(96);
        expect(counts.get("slot-row")).toBeUndefined();
        // a commit reaches every part's computed once (about 510): the same record unless it changed
        expect(counted.reads).toBeLessThanOrEqual(550);
        expect(counted.committed).toBe(1);
    });

    it("a render of the app that does not touch the calendar tells the engine nothing", async () => {
        const { component, counts, reset } = await scene();
        reset();
        component.status.set("saved");
        await flush();
        expect(counts.get("app")).toBe(1);
        // nothing of the calendar changed: no part read, the engine not told (1 before Issue #25)
        expect(counted.reads).toBe(0);
        expect(counted.committed).toBe(0);
        // app state the calendar's templates show: the engine measures after that render
        component.label.set(" (moved)");
        await flush();
        expect(counted.committed).toBe(1);
    });
});
