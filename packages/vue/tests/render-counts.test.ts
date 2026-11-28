// Render-count budgets (Issue #25), as packages/react's: the drag-and-resize example's week, its
// slots a template's (stable), counts the components Vue renders (mounts and updates) and the parts'
// attribute reads for 30 preview changes and for the drop. A preview change re-renders the
// previews, not the cells, and a part's computed reads again only when its revision moved (the
// engine's `affects`); the drop renders the columns the event left and entered, not the slots.
import { fireEvent } from "@testing-library/dom";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { type ComponentOptions, h } from "vue";
import { Calendar } from "../src";
import { dragAndDrop } from "../src/drag-and-drop";
import { resize } from "../src/resize";
import { allDay, modelOf, timed, view } from "./calendar";
import { center, flush } from "./interaction";

// the parts' reads of their attributes: each a part's computed that ran again
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

/** The example's week, its slots a template's. */
const Week = view(
    `<Calendar.TimeGrid>
        <Calendar.ColumnHeaders v-slot="{ date }">
            <Calendar.ColumnHeader :date="date" />
        </Calendar.ColumnHeaders>
        <Calendar.AllDayRow>
            <Calendar.Days v-slot="{ day }">
                <Calendar.Day :day="day">
                    <Calendar.DayEvents v-slot="{ segment }">
                        <Calendar.Segment :segment="segment">
                            <ResizeHandle edge="end" />
                        </Calendar.Segment>
                    </Calendar.DayEvents>
                </Calendar.Day>
            </Calendar.Days>
            <DragPreview />
        </Calendar.AllDayRow>
        <Calendar.Scroller>
            <Calendar.SlotRows v-slot="{ slot }">
                <Calendar.SlotRow :slot="slot">
                    <Calendar.SlotLabel />
                    <Calendar.Slots v-slot="{ column }">
                        <Calendar.Slot :date="column.date" />
                    </Calendar.Slots>
                </Calendar.SlotRow>
            </Calendar.SlotRows>
            <Calendar.Columns v-slot="{ column }">
                <Calendar.Column :column="column">
                    <Calendar.ColumnEvents v-slot="{ segment }">
                        <Calendar.TimeEvent :segment="segment">
                            <span>{{ segment.eventId }}</span>
                            <ResizeHandle edge="start" />
                            <ResizeHandle edge="end" />
                        </Calendar.TimeEvent>
                    </Calendar.ColumnEvents>
                    <DragPreview />
                </Calendar.Column>
            </Calendar.Columns>
        </Calendar.Scroller>
    </Calendar.TimeGrid>`,
);

/** What a counting window saw: the components mounted or updated, by name. */
interface RenderCount {
    renders: number;
    byName: Record<string, number>;
}

let counting: RenderCount | null = null;

function counted(this: { $options: { name?: string } }) {
    if (!counting) return;
    counting.renders++;
    const name = this.$options.name ?? "anonymous";
    counting.byName[name] = (counting.byName[name] ?? 0) + 1;
}

/** Every component's mount and update (a render each). */
const COUNTER: ComponentOptions = {
    beforeMount: counted,
    beforeUpdate: counted,
};

/** Counts the components Vue renders for `run`, its flushes included. */
async function countRenders(run: () => Promise<void>): Promise<RenderCount> {
    const count: RenderCount = { renders: 0, byName: {} };
    counting = count;
    try {
        await run();
    } finally {
        counting = null;
    }
    return count;
}

/** The week, and a pointer drag of an event in steps: its start, its moves and its drop. */
async function scene() {
    const model = busyWeek();
    const wrapper = mount(() => h(Calendar.Root, { model }, () => h(Week)), {
        attachTo: document.body,
        global: { mixins: [COUNTER] },
    });
    await flush();
    const container = wrapper.element.parentElement as HTMLElement;
    const planning = container.querySelector(
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
    };
}

describe("render counts (Issue #25)", () => {
    it("30 preview changes re-render the previews, not the grid", async () => {
        const { begin, moves } = await scene();
        await begin();
        reads.count = 0;
        const count = await countRenders(moves);
        // the preview where it is and where it was (270 renders and 15,150 reads before Issue #25:
        // every preview, and every part's computed)
        expect(count.renders).toBeLessThanOrEqual(80);
        expect(count.byName.CalendarSlot).toBeUndefined();
        expect(count.byName.CalendarTimeEvent).toBeUndefined();
        // the previews' attributes, one a move
        expect(reads.count).toBeLessThanOrEqual(40);
    });

    it("the drop renders the columns it touched", async () => {
        const { model, begin, moves, drop } = await scene();
        await begin();
        await moves();
        reads.count = 0;
        const count = await countRenders(drop);
        expect(model.get("event-by", { id: "planning" })).toMatchObject({
            start: "2026-11-25T10:00:00Z",
        });
        // the two columns (their events, previews and handles), the grid's collections and the 48
        // slot rows' `Slots` that call their slot again (179 before Issue #25: 96 `MemoCall`s)
        expect(count.renders).toBeLessThanOrEqual(100);
        expect(count.byName.CalendarSlot).toBeUndefined();
        expect(count.byName.CalendarTimeEvent).toBeLessThanOrEqual(3);
        // a commit reaches every part's computed once (about 510): the same record unless it changed
        expect(reads.count).toBeLessThanOrEqual(550);
    });
});
