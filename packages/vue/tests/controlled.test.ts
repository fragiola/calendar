// Root props, controlled and uncontrolled (`architecture/core-and-adapters.md`: they map onto
// commands), as packages/react's in Vue terms: `v-model:events`, `v-model:view`, `v-model:date`
// with `@events-change`, `@view-change`, `@date-change` beside them, and `settings`; the engine's
// and the features' events are fallthrough attributes the root reads; the features are the
// model's; a calendar ref reaches the root from outside.
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref, shallowRef } from "vue";
import {
    Calendar,
    type CalendarEventJson,
    type CalendarEventOf,
    createCalendarRef,
    type RootView,
    useCalendarTitle,
    useCalendarView,
} from "../src";
import { selection } from "../src/selection";
import {
    allDay,
    COMPONENTS,
    MonthGrid,
    modelOf,
    NOW,
    SETTINGS,
    timed,
} from "./calendar";
import { flush } from "./interaction";

/** The view and the title, as text (for the tests only: a primitive renders no text). */
const Shown = defineComponent({
    setup() {
        const view = useCalendarView();
        const title = useCalendarTitle({ month: "long", year: "numeric" });
        return () =>
            h(
                "output",
                `${view.value.type} ${view.value.visibleRange.start} ${title.value.map((part) => part.value).join("")}`,
            );
    },
});

const now = () => NOW;

describe("uncontrolled props", () => {
    it("create the root's model from the defaults, once", async () => {
        const calendar = createCalendarRef();
        const props = shallowRef<Record<string, unknown>>({
            calendarRef: calendar,
            defaultEvents: [allDay("a", "2026-11-26", "2026-11-27")],
            defaultView: "week",
            defaultDate: "2026-12-10",
            settings: SETTINGS,
            now,
        });
        const wrapper = mount(() =>
            h(Calendar.Root, props.value, () => h(Shown)),
        );
        await flush();
        expect(wrapper.text()).toMatch(/^week 2026-12-06/);
        const model = calendar.value?.model;
        expect(model?.state.events.map((event) => event.id)).toEqual(["a"]);
        props.value = {
            calendarRef: calendar,
            defaultEvents: [],
            defaultView: "month",
            settings: SETTINGS,
            now,
        };
        await flush();
        expect(calendar.value?.model).toBe(model);
        expect(model?.state.events).toHaveLength(1);
        expect(model?.state.view.type).toBe("week");
    });
});

/** A `v-model:events` list kept in the app's ref, with a button that adds one. */
function controlled(initial: CalendarEventJson[]) {
    const calendar = createCalendarRef();
    const onChange = vi.fn();
    const events =
        ref<readonly (CalendarEventJson | CalendarEventOf)[]>(initial);
    const App = defineComponent({
        components: { ...COMPONENTS, MonthGrid },
        setup: () => ({
            calendar,
            events,
            onChange,
            settings: SETTINGS,
            now,
            add: () => {
                events.value = [
                    ...events.value,
                    timed("added", "13:00", "14:00"),
                ];
            },
        }),
        template: `
            <button type="button" @click="add">add</button>
            <Calendar.Root
                :calendar-ref="calendar"
                v-model:events="events"
                @events-change="onChange"
                :settings="settings"
                :now="now"
                default-view="month"
            >
                <MonthGrid />
            </Calendar.Root>`,
    });
    const wrapper = mount(App, { attachTo: document.body });
    return { wrapper, calendar, onChange, events };
}

describe("v-model:events", () => {
    it("replaces the model's events with a new list, unreported", async () => {
        const { wrapper, calendar, onChange } = controlled([
            allDay("a", "2026-11-26", "2026-11-27"),
        ]);
        await flush();
        await wrapper.get("button").trigger("click");
        await flush();
        expect(
            calendar.value?.model.state.events.map((event) => event.id),
        ).toEqual(["a", "added"]);
        expect(
            document.querySelectorAll('[data-calendar-part="segment"]'),
        ).toHaveLength(2);
        // the controlled list's own command is not reported back
        expect(onChange).not.toHaveBeenCalled();
    });

    it("reports the model's own changes, and runs nothing for the list reported back", async () => {
        const { calendar, onChange, events } = controlled([
            timed("t", "09:00", "10:00"),
        ]);
        await flush();
        const model = calendar.value?.model;
        const commands: string[] = [];
        model?.subscribe((event) => commands.push(event.command));
        model?.run("event.move", { eventId: "t", delta: { minutes: 30 } });
        await flush();
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0]?.[0]).toBe(model?.state.events);
        // the frozen list is never made reactive: the app's ref holds the model's own list
        expect(events.value).toBe(model?.state.events);
        // the app set the reported list as its state: the root ran no set-all for it
        expect(commands).toEqual(["event.move"]);
    });

    it("warns when a list cannot be applied, the model's events staying", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const calendar = createCalendarRef();
        const events = shallowRef([allDay("a", "2026-11-26", "2026-11-27")]);
        mount(() =>
            h(Calendar.Root, {
                calendarRef: calendar,
                events: events.value,
                settings: SETTINGS,
                now,
            }),
        );
        await flush();
        events.value = [allDay("a", "2026-11-27", "2026-11-26")];
        await flush();
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("a controlled prop was not applied"),
        );
        expect(calendar.value?.model.state.events[0]?.start).toBe("2026-11-26");
        warn.mockRestore();
    });
});

describe("v-model:view and v-model:date", () => {
    it("bring the model to the props, and report the user's navigation", async () => {
        const view = ref<"month" | "week" | "days">("month");
        const date = ref("2026-11-26");
        const onViewChange = vi.fn<(view: RootView) => void>();
        const onDateChange = vi.fn<(date: string) => void>();
        const App = defineComponent({
            components: { ...COMPONENTS, Shown },
            setup: () => ({
                view,
                date,
                onViewChange,
                onDateChange,
                settings: SETTINGS,
                now,
            }),
            template: `
                <Calendar.Root
                    v-model:view="view"
                    v-model:date="date"
                    @view-change="onViewChange"
                    @date-change="onDateChange"
                    :settings="settings"
                    :now="now"
                >
                    <Shown />
                    <Calendar.Next data-testid="next" />
                    <Calendar.ViewButton view="days" :days="3" data-testid="days" />
                </Calendar.Root>`,
        });
        const wrapper = mount(App);
        await flush();
        expect(wrapper.get("output").text()).toBe(
            "month 2026-11-01 November 2026",
        );
        view.value = "week";
        await flush();
        expect(wrapper.get("output").text()).toMatch(/^week 2026-11-22/);
        date.value = "2027-01-05";
        await flush();
        expect(wrapper.get("output").text()).toMatch(/^week 2027-01-03/);
        expect(onViewChange).not.toHaveBeenCalled();
        expect(onDateChange).not.toHaveBeenCalled();
        await wrapper.get('[data-testid="next"]').trigger("click");
        await flush();
        expect(onDateChange).toHaveBeenCalledWith("2027-01-10");
        // v-model wrote the reported date back
        expect(date.value).toBe("2027-01-10");
        await wrapper.get('[data-testid="days"]').trigger("click");
        await flush();
        expect(onViewChange).toHaveBeenCalledWith({ type: "days", days: 3 });
        expect(view.value).toBe("days");
        expect(wrapper.get("output").text()).toMatch(/^days 2027-01-10/);
    });

    it("applies a changed settings value", async () => {
        const calendar = createCalendarRef();
        const settings = shallowRef(SETTINGS);
        mount(() =>
            h(Calendar.Root, {
                calendarRef: calendar,
                settings: settings.value,
                now,
            }),
        );
        await flush();
        settings.value = { ...SETTINGS, firstDayOfWeek: 1 };
        await flush();
        expect(calendar.value?.model.state.settings.firstDayOfWeek).toBe(1);
    });
});

describe("features and the root", () => {
    it("takes a feature's event from the fallthrough attributes, and warns without the feature", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const wrapper = mount(() =>
            h(Calendar.Root, { model, onSelect: () => {} }),
        );
        await flush();
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("onSelect needs the selection feature"),
        );
        // never the element's own DOM listener
        expect(wrapper.element.getAttribute("onselect")).toBeNull();
        warn.mockRestore();
    });

    it("calls a feature's event given as a fallthrough attribute (`@select`)", async () => {
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
            features: [selection()],
        });
        const onSelect = vi.fn();
        const onDateClick = vi.fn();
        const App = defineComponent({
            components: { ...COMPONENTS, MonthGrid },
            setup: () => ({ model, onSelect, onDateClick }),
            template: `
                <Calendar.Root :model="model" @select="onSelect" @date-click="onDateClick">
                    <MonthGrid />
                </Calendar.Root>`,
        });
        const wrapper = mount(App, { attachTo: document.body });
        await flush();
        const day = wrapper.get(
            '[data-calendar-part="day"][data-date="2026-11-24"]',
        ).element as HTMLElement;
        day.focus();
        day.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: "ArrowRight",
                shiftKey: true,
                bubbles: true,
            }),
        );
        await flush();
        (document.activeElement as HTMLElement).dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        );
        await flush();
        expect(onSelect).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "select",
                range: { start: "2026-11-24", end: "2026-11-26", allDay: true },
            }),
        );
    });

    it("renders nothing for a feature's part without its feature, and warns once", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const wrapper = mount(() =>
            h(Calendar.Root, { model }, () => h(MonthGrid, { features: true })),
        );
        await flush();
        expect(wrapper.find('[data-calendar-part="selection"]').exists()).toBe(
            false,
        );
        expect(
            warn.mock.calls.filter(([message]) =>
                String(message).includes(
                    "Calendar.Selection needs the selection feature",
                ),
            ),
        ).toHaveLength(1);
        warn.mockRestore();
    });

    it("warns when the features prop changes after the model was created", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const features = shallowRef<readonly unknown[]>([]);
        mount(() =>
            h(Calendar.Root, {
                features: features.value as never,
                settings: SETTINGS,
                now,
            }),
        );
        await flush();
        features.value = [selection()];
        await flush();
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("the features prop changed"),
        );
        warn.mockRestore();
    });

    it("creates its own model when a model prop is dropped after mount", async () => {
        const model = modelOf();
        const calendar = createCalendarRef();
        const given = shallowRef<typeof model | undefined>(model);
        mount(() =>
            h(Calendar.Root, {
                model: given.value,
                calendarRef: calendar,
                settings: SETTINGS,
                now,
                defaultView: "week",
            }),
        );
        await flush();
        expect(calendar.value?.model).toBe(model);
        given.value = undefined;
        await flush();
        expect(calendar.value?.model).not.toBe(model);
        expect(calendar.value?.model.state.view.type).toBe("week");
    });

    it("gives a calendar ref the model and an engine that answers before the root mounts", async () => {
        const calendar = createCalendarRef();
        expect(calendar.value).toBeNull();
        const wrapper = mount(() =>
            h(Calendar.Root, {
                calendarRef: calendar,
                settings: SETTINGS,
                now,
            }),
        );
        await nextTick();
        expect(calendar.value?.engine.get("focused")).toBeNull();
        expect(
            calendar.value?.engine.run("focus", { date: "2026-11-26" }).ok,
        ).toBe(true);
        wrapper.unmount();
        expect(calendar.value).toBeNull();
    });
});
