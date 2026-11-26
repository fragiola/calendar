// The root's inputs, controlled and uncontrolled (`architecture/core-and-adapters.md`: they map
// onto commands): the two-way `[(events)]`, `[(view)]` and `[(date)]` (an input and its `*Change`
// output), `settings`; the change outputs hear every other change; a given model is brought to the
// controlled inputs after the first render (a server render shows the model's state, so the
// client hydrates it); the features are the model's; a calendar ref reaches the root from outside.
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";
import { selection } from "../selection/public-api";
import {
    CALENDAR,
    type CalendarEventJson,
    type CalendarEventOf,
    type CalendarModel,
    createCalendarRef,
    injectCalendarTitle,
    injectCalendarView,
    type RootView,
    type ViewType,
} from "../src/public-api";
import { allDay, modelOf, NOW, SETTINGS, timed } from "./calendar";
import { flush, render } from "./interaction";

/** What a calendar shows, as text: its view, its first visible day and its title. */
@Component({
    selector: "test-shown",
    template: `<output>{{ view().type }} {{ view().visibleRange.start }} {{ titleText() }}</output>`,
})
class Shown {
    readonly view = injectCalendarView();
    readonly title = injectCalendarTitle({ month: "long", year: "numeric" });
    titleText(): string {
        return this.title()
            .map((part) => part.value)
            .join("");
    }
}

const text = (container: HTMLElement) =>
    container.querySelector("output")?.textContent ?? "";

describe("uncontrolled inputs", () => {
    it("create the root's model from the defaults, once", async () => {
        const ref = createCalendarRef();
        @Component({
            imports: [CALENDAR, Shown],
            template: `
                <div
                    calendarRoot
                    [calendarRef]="ref"
                    [defaultEvents]="defaults()"
                    [defaultView]="defaultView()"
                    defaultDate="2026-12-10"
                    [settings]="settings"
                    [now]="now"
                >
                    <test-shown />
                </div>
            `,
        })
        class Uncontrolled {
            readonly ref = ref;
            readonly settings = SETTINGS;
            readonly now = () => NOW;
            readonly defaults = signal<CalendarEventJson[]>([
                allDay("a", "2026-11-26", "2026-11-27"),
            ]);
            readonly defaultView = signal<ViewType>("week");
        }
        const { container, component } = await render(Uncontrolled);
        expect(text(container)).toMatch(/^week 2026-12-06/);
        const model = ref.current?.model;
        expect(model?.state.events.map((event) => event.id)).toEqual(["a"]);
        component.defaults.set([]);
        component.defaultView.set("month");
        await flush();
        expect(ref.current?.model).toBe(model);
        expect(model?.state.events).toHaveLength(1);
        expect(model?.state.view.type).toBe("week");
    });
});

/** A controlled list, view and date in signals, two-way bound. */
@Component({
    imports: [CALENDAR, Shown],
    template: `
        <div
            calendarRoot
            [calendarRef]="ref"
            [(events)]="events"
            [(view)]="view"
            [(date)]="date"
            (eventsChange)="changes.events($event)"
            (viewChangeDetails)="changes.view($event)"
            (dateChange)="changes.date($event)"
            [settings]="settings()"
            [now]="now"
        >
            <test-shown />
        </div>
    `,
})
class Controlled {
    readonly ref = createCalendarRef();
    readonly now = () => NOW;
    readonly settings = signal(SETTINGS);
    readonly events = signal<readonly (CalendarEventJson | CalendarEventOf)[]>([
        allDay("a", "2026-11-26", "2026-11-27"),
    ]);
    readonly view = signal<ViewType>("month");
    readonly date = signal("2026-11-26");
    readonly changes = {
        events: vi.fn<(events: readonly CalendarEventOf[]) => void>(),
        view: vi.fn<(view: RootView) => void>(),
        date: vi.fn<(date: string) => void>(),
    };
}

describe("two-way bindings", () => {
    it("[(events)]: a new list replaces the model's events, unreported; the model's own changes come back", async () => {
        const { component } = await render(Controlled);
        const model = component.ref.current?.model as CalendarModel;
        expect(model.state.events.map((event) => event.id)).toEqual(["a"]);
        component.events.set([
            ...component.events(),
            timed("added", "13:00", "14:00"),
        ]);
        await flush();
        expect(model.state.events.map((event) => event.id)).toEqual([
            "a",
            "added",
        ]);
        expect(component.changes.events).not.toHaveBeenCalled();
        // a change of the model's own: reported, and the list it reports runs nothing back
        const run = vi.spyOn(model, "run");
        model.run("event.remove", { eventId: "a" });
        await flush();
        expect(component.changes.events).toHaveBeenCalledTimes(1);
        expect(component.events()).toBe(model.state.events);
        expect(run).toHaveBeenCalledTimes(1);
        run.mockRestore();
    });

    it("[(view)] and [(date)]: the model goes to the inputs, and the user's navigation comes back", async () => {
        const { component, container } = await render(Controlled);
        const model = component.ref.current?.model as CalendarModel;
        component.view.set("week");
        component.date.set("2026-12-10");
        await flush();
        expect(text(container)).toMatch(/^week 2026-12-06/);
        expect(component.changes.view).not.toHaveBeenCalled();
        expect(component.changes.date).not.toHaveBeenCalled();
        model.run("view.set", { type: "days", days: 3 });
        model.run("view.next", {});
        await flush();
        expect(component.view()).toBe("days");
        expect(component.changes.view).toHaveBeenCalledWith({
            type: "days",
            days: 3,
        });
        expect(component.date()).toBe(model.state.view.anchorDate);
        expect(component.changes.date).toHaveBeenLastCalledWith(
            model.state.view.anchorDate,
        );
    });

    it("applies a changed settings value", async () => {
        const { component } = await render(Controlled);
        component.settings.set({ ...SETTINGS, firstDayOfWeek: 1 });
        await flush();
        expect(component.ref.current?.model.state.settings.firstDayOfWeek).toBe(
            1,
        );
    });

    it("warns once when a value cannot be applied, the model's staying", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { component } = await render(Controlled);
        const model = component.ref.current?.model as CalendarModel;
        component.events.set([
            {
                id: "bad",
                title: "bad",
                start: "nope",
                end: "nope",
                allDay: true,
            },
        ]);
        await flush();
        expect(model.state.events.map((event) => event.id)).toEqual(["a"]);
        expect(
            warn.mock.calls.filter(([message]) =>
                String(message).includes("a controlled input was not applied"),
            ),
        ).toHaveLength(1);
        warn.mockRestore();
    });
});

describe("a given model with controlled inputs", () => {
    it("renders the model's state first, then brings it to the inputs (a server render hydrates)", async () => {
        const renders: string[] = [];
        @Component({
            selector: "test-recorded",
            template: `{{ record() }}`,
        })
        class Recorded {
            readonly view = injectCalendarView();
            record(): string {
                const view = this.view();
                renders.push(`${view.type} ${view.visibleRange.start}`);
                return "";
            }
        }
        @Component({
            imports: [CALENDAR, Recorded],
            template: `
                <div [calendarRoot]="model" date="2027-01-15">
                    <test-recorded />
                </div>
            `,
        })
        class Given {
            readonly model = modelOf([], {
                view: { type: "month", anchorDate: "2026-11-26" },
            });
        }
        const { component } = await render(Given);
        // the first render is the model's own month, as a server render of it shows (the client
        // hydrates it); once rendered, the controlled date
        expect(renders[0]).toBe("month 2026-11-01");
        expect(component.model.state.view.anchorDate).toBe("2027-01-15");
        expect(renders.at(-1)).toBe("month 2026-12-27");
    });
});

describe("the features and the calendar ref", () => {
    it("warns when the features input changes after the model was created", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        @Component({
            imports: [CALENDAR],
            template: `<div calendarRoot [features]="features()" [now]="now"></div>`,
        })
        class Features {
            readonly now = () => NOW;
            readonly features = signal<readonly ReturnType<typeof selection>[]>(
                [],
            );
        }
        const { component } = await render(Features);
        component.features.set([selection()]);
        await flush();
        expect(
            warn.mock.calls.filter(([message]) =>
                String(message).includes("the features input changed"),
            ),
        ).toHaveLength(1);
        warn.mockRestore();
    });

    it("gives a calendar ref the model and an engine that answers before the root renders, and lets it go", async () => {
        const ref = createCalendarRef();
        @Component({
            imports: [CALENDAR],
            template: `
                @if (shown()) {
                    <div calendarRoot [calendarRef]="ref" [now]="now"></div>
                }
            `,
        })
        class Referenced {
            readonly ref = ref;
            readonly now = () => NOW;
            readonly shown = signal(true);
        }
        const fixture = TestBed.createComponent(Referenced);
        fixture.detectChanges();
        // before the engine: a read is empty, an action refused
        expect(ref.current?.engine.get("focused")).toBeNull();
        await fixture.whenStable();
        await flush();
        expect(
            ref.current?.engine.run("focus", { date: "2026-11-26" }).ok,
        ).toBe(true);
        fixture.componentInstance.shown.set(false);
        await fixture.whenStable();
        expect(ref.current).toBeNull();
    });
});
