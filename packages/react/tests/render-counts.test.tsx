// Render-count budgets (Issue #25): the drag-and-resize example's week, its children functions
// stable (module functions), counts the components React renders and the parts' attribute reads
// for 30 preview changes and for the drop. A preview change re-renders the previews, not the cells,
// and the store skips the reads of the parts it cannot change (`affects`); the drop renders the
// columns the event left and entered (their events, their previews), not the grid's slots.
import type {
    DayCell,
    Segment,
    TimeGridColumn,
    TimeSegment,
    TimeSlot,
} from "@fragiola/calendar";
import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Calendar } from "../src";
import { DragPreview, dragAndDrop } from "../src/drag-and-drop";
import { ResizeHandle, resize } from "../src/resize";
import { allDay, modelOf, timed } from "./calendar";
import { center } from "./interaction";
import { countRenders } from "./render-counter";

// the parts' reads of their attributes: each a `usePart` snapshot the store did not skip
const reads = vi.hoisted(() => ({ count: 0 }));

vi.mock("@fragiola/calendar", async (original) => {
    const actual = await original<typeof import("@fragiola/calendar")>();
    return {
        ...actual,
        createCalendarEngine: (
            ...args: Parameters<typeof actual.createCalendarEngine>
        ) => {
            const engine = actual.createCalendarEngine(...args);
            // the engine's verbs are arrow functions: a copy with a counted read is the same engine
            const { attributes } = engine.adapter;
            return {
                ...engine,
                adapter: {
                    ...engine.adapter,
                    attributes: (...call: Parameters<typeof attributes>) => {
                        reads.count++;
                        return attributes(...call);
                    },
                },
            };
        },
    };
});

const FEATURES = [dragAndDrop(), resize()] as const;

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
            features: FEATURES,
        },
    );
}

function header(date: string) {
    return <Calendar.ColumnHeader date={date} />;
}

function allDaySegment(segment: Segment) {
    return (
        <Calendar.Segment segment={segment}>
            <ResizeHandle edge="end" />
        </Calendar.Segment>
    );
}

function allDayCell(day: DayCell) {
    return (
        <Calendar.Day day={day}>
            <Calendar.DayEvents>{allDaySegment}</Calendar.DayEvents>
        </Calendar.Day>
    );
}

function slotCell(column: TimeGridColumn) {
    return <Calendar.Slot date={column.date} />;
}

function slotRow(slot: TimeSlot) {
    return (
        <Calendar.SlotRow slot={slot}>
            <Calendar.SlotLabel />
            <Calendar.Slots>{slotCell}</Calendar.Slots>
        </Calendar.SlotRow>
    );
}

function timedEvent(segment: TimeSegment) {
    return (
        <Calendar.TimeEvent segment={segment}>
            <span>{segment.eventId}</span>
            <ResizeHandle edge="start" />
            <ResizeHandle edge="end" />
        </Calendar.TimeEvent>
    );
}

function column(column: TimeGridColumn) {
    return (
        <Calendar.Column column={column}>
            <Calendar.ColumnEvents>{timedEvent}</Calendar.ColumnEvents>
            <DragPreview />
        </Calendar.Column>
    );
}

function Week() {
    return (
        <Calendar.TimeGrid>
            <Calendar.ColumnHeaders>{header}</Calendar.ColumnHeaders>
            <Calendar.AllDayRow>
                <Calendar.Days>{allDayCell}</Calendar.Days>
                <DragPreview />
            </Calendar.AllDayRow>
            <Calendar.Scroller>
                <Calendar.SlotRows>{slotRow}</Calendar.SlotRows>
                <Calendar.Columns>{column}</Calendar.Columns>
            </Calendar.Scroller>
        </Calendar.TimeGrid>
    );
}

/** The week, and a pointer drag of an event in steps, split into its press, moves and drop. */
function scene() {
    const model = busyWeek();
    const view = render(
        <Calendar.Root model={model}>
            <Week />
        </Calendar.Root>,
    );
    const planning = view.container.querySelector(
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
    const move = (x: number, y: number) =>
        act(() => {
            fireEvent.pointerMove(planning, init(start.x + x, start.y + y, 1));
        });
    // two days on (Wednesday 10:00) in 30 moves, each half an hour up or down (a slot): a new
    // preview each
    const dx = 200;
    return {
        model,
        /** the press and a first move, which starts the drag (half an hour earlier) */
        begin() {
            act(() => {
                fireEvent.pointerDown(planning, init(start.x, start.y, 1));
            });
            move(0, -30);
        },
        moves() {
            for (let step = 1; step <= 30; step++) {
                move((dx * step) / 30, (step % 2) * 30);
            }
        },
        drop() {
            act(() => {
                fireEvent.pointerUp(planning, init(start.x + dx, start.y, 0));
            });
        },
    };
}

describe("render counts (Issue #25)", () => {
    it("30 preview moves re-render the previews and the dragged event, not the grid", () => {
        const { begin, moves } = scene();
        begin();
        reads.count = 0;
        const count = countRenders(moves);
        // 30 commits: the root (which tells the engine each commit), the preview where it is and
        // where it was (300 renders and 15,210 reads before Issue #25: every preview and every part)
        expect(count.commits).toBe(30);
        expect(count.renders).toBeLessThanOrEqual(100);
        expect(count.byName.Slot).toBeUndefined();
        expect(count.byName.TimeEvent).toBeUndefined();
        // the root's and the previews' attributes, about 3 a move
        expect(reads.count).toBeLessThanOrEqual(120);
    });

    it("the drop renders at most 100 components: the columns it touched", () => {
        const { model, begin, moves, drop } = scene();
        begin();
        moves();
        reads.count = 0;
        const count = countRenders(drop);
        expect(model.get("event-by", { id: "planning" })).toMatchObject({
            start: "2026-11-25T10:00:00Z",
        });
        // the two columns (their events, previews and handles), the grid's collections and the 48
        // slot rows' `Slots` that call their two changed days again (378 before Issue #25: 96
        // `Slot`s and their 192 `MemoCall`s)
        expect(count.renders).toBeLessThanOrEqual(100);
        expect(count.byName.Slot).toBeUndefined();
        expect(count.byName.TimeEvent).toBeLessThanOrEqual(3);
        // a commit reaches every part (about 510): its record is the same unless it changed, read
        // once for the command and once for the gesture's end
        expect(reads.count).toBeLessThanOrEqual(1100);
    });
});
