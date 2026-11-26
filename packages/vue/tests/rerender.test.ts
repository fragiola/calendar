// Moving one event re-renders only the rows and columns it touches (D11: the layout keeps the other
// rows' objects), as packages/react's. A collection part calls its slot again for an entity whose
// layout object changed, and for every entity when the slot function itself is a new one (a render
// function's inline slot); a template's compiled slot is stable, and the reactive state it reads
// re-renders exactly the calls that read it, so the state it shows is never stale.
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, ref } from "vue";
import { Calendar, type DayGridWeek } from "../src";
import { allDay, COMPONENTS, modelOf, timed } from "./calendar";
import { flush } from "./interaction";

function counter() {
    const calls = new Map<string, number>();
    return {
        calls,
        count(key: string) {
            calls.set(key, (calls.get(key) ?? 0) + 1);
            return "";
        },
        snapshot: () => new Map(calls),
        changed(since: Map<string, number>) {
            return [...calls]
                .filter(([key, count]) => since.get(key) !== count)
                .map(([key]) => key)
                .sort();
        },
    };
}

const EVENTS = [
    allDay("a", "2026-11-03", "2026-11-04"),
    allDay("b", "2026-11-17", "2026-11-18"),
];

describe("re-rendering what changed", () => {
    it("re-renders the week rows an event moves between, not the others (a template)", async () => {
        const model = modelOf(EVENTS, {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const weeks = counter();
        const tag = ref(1);
        const App = defineComponent({
            components: COMPONENTS,
            setup: () => ({ model, count: weeks.count, tag }),
            template: `
                <Calendar.Root :model="model">
                    <Calendar.DayGrid :data-tag="tag">
                        <Calendar.Weeks v-slot="{ week }">
                            <Calendar.Week :week="week" :data-counted="count(week.id)">
                                <template #day="{ day }">
                                    <Calendar.Day :day="day">
                                        <Calendar.DayEvents v-slot="{ segment }">
                                            <Calendar.Segment :segment="segment" />
                                        </Calendar.DayEvents>
                                    </Calendar.Day>
                                </template>
                            </Calendar.Week>
                        </Calendar.Weeks>
                    </Calendar.DayGrid>
                </Calendar.Root>`,
        });
        mount(App, { attachTo: document.body });
        await flush();
        expect(weeks.calls.size).toBe(6);
        let before = weeks.snapshot();
        model.run("event.move", { eventId: "a", delta: { days: 7 } });
        await flush();
        // the row it left and the row it entered
        expect(weeks.changed(before)).toEqual(["2026-11-01", "2026-11-08"]);
        before = weeks.snapshot();
        // the app renders again, its slot the same compiled one: no row changed
        tag.value = 2;
        await flush();
        expect(
            document.querySelector("[data-tag]")?.getAttribute("data-tag"),
        ).toBe("2");
        expect(weeks.changed(before)).toEqual([]);
    });

    it("keeps the state a slot reads current: only the calls that read it render again", async () => {
        const model = modelOf(EVENTS, {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const weeks = counter();
        const highlighted = ref("a");
        const App = defineComponent({
            components: COMPONENTS,
            setup: () => ({ model, count: weeks.count, highlighted }),
            template: `
                <Calendar.Root :model="model">
                    <Calendar.DayGrid>
                        <Calendar.Weeks v-slot="{ week }">
                            <Calendar.Week :week="week" :data-counted="count(week.id)">
                                <template #day="{ day }">
                                    <Calendar.Day :day="day">
                                        <Calendar.DayEvents v-slot="{ segment }">
                                            <Calendar.Segment
                                                :segment="segment"
                                                :data-highlighted="segment.eventId === highlighted ? '' : undefined"
                                            />
                                        </Calendar.DayEvents>
                                    </Calendar.Day>
                                </template>
                            </Calendar.Week>
                        </Calendar.Weeks>
                    </Calendar.DayGrid>
                </Calendar.Root>`,
        });
        mount(App, { attachTo: document.body });
        await flush();
        const marked = () =>
            [...document.querySelectorAll("[data-highlighted]")].map(
                (element) => element.getAttribute("data-event-id"),
            );
        expect(marked()).toEqual(["a"]);
        const before = weeks.snapshot();
        highlighted.value = "b";
        await flush();
        expect(marked()).toEqual(["b"]);
        // the segments' slots read it, not the rows': no row rendered again
        expect(weeks.changed(before)).toEqual([]);
    });

    it("calls a render function's slot again for every row, unless its slots are `$stable`", async () => {
        const model = modelOf(EVENTS, {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const weeks = counter();
        const tag = ref(1);
        const marked = ref(false);
        const row = ({ week }: { week: DayGridWeek }) => {
            weeks.count(week.id);
            return [h(Calendar.Week, { week })];
        };
        mount(
            () =>
                h(Calendar.Root, { model, "data-tag": tag.value }, () =>
                    h(Calendar.DayGrid, null, () =>
                        h(
                            Calendar.Weeks,
                            null,
                            marked.value
                                ? { default: row, $stable: true }
                                : { default: row },
                        ),
                    ),
                ),
            { attachTo: document.body },
        );
        await flush();
        let before = weeks.snapshot();
        // Vue wraps a render function's slot anew on every render: every row again
        tag.value = 2;
        await flush();
        expect(weeks.changed(before)).toHaveLength(6);
        marked.value = true;
        await flush();
        before = weeks.snapshot();
        // `$stable` (Vue's hint) keeps the slot: only a changed row renders again
        tag.value = 3;
        await flush();
        expect(weeks.changed(before)).toEqual([]);
        model.run("event.move", { eventId: "a", delta: { days: 7 } });
        await flush();
        expect(weeks.changed(before)).toEqual(["2026-11-01", "2026-11-08"]);
    });

    it("re-renders the columns a timed event moves between, not the others", async () => {
        const model = modelOf([timed("t", "09:00", "10:00")], {
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        const columns = counter();
        const App = defineComponent({
            components: COMPONENTS,
            setup: () => ({ model, count: columns.count }),
            template: `
                <Calendar.Root :model="model">
                    <Calendar.TimeGrid>
                        <Calendar.Columns v-slot="{ column }">
                            <Calendar.Column :column="column" :data-counted="count(column.date)">
                                <Calendar.ColumnEvents v-slot="{ segment }">
                                    <Calendar.TimeEvent :segment="segment" />
                                </Calendar.ColumnEvents>
                            </Calendar.Column>
                        </Calendar.Columns>
                    </Calendar.TimeGrid>
                </Calendar.Root>`,
        });
        mount(App, { attachTo: document.body });
        await flush();
        expect(columns.calls.size).toBe(7);
        const before = columns.snapshot();
        model.run("event.move", { eventId: "t", delta: { days: 1 } });
        await flush();
        expect(columns.changed(before)).toEqual(["2026-11-26", "2026-11-27"]);
    });
});
