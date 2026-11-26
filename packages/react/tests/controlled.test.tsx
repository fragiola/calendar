// Root props, controlled and uncontrolled (`architecture/core-and-adapters.md`: they map onto
// commands): events, view, date and settings; the change callbacks hear every other change; the
// features are the model's; a calendar ref reaches the root from outside.
import { act, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import {
    Calendar,
    type CalendarEventJson,
    type CalendarEventOf,
    type CalendarRef,
    createCalendarRef,
    type RootView,
    useCalendarTitle,
    useCalendarView,
} from "../src";
import { selection } from "../src/selection";
import { allDay, MonthGrid, modelOf, NOW, SETTINGS, timed } from "./calendar";

function Shown() {
    const view = useCalendarView();
    const title = useCalendarTitle({ month: "long", year: "numeric" });
    return (
        <output data-calendar-part="test">
            {`${view.type} ${view.visibleRange.start} ${title.map((part) => part.value).join("")}`}
        </output>
    );
}

describe("uncontrolled props", () => {
    it("create the root's model from the defaults, once", () => {
        const ref = createCalendarRef();
        const { rerender } = render(
            <Calendar.Root
                calendarRef={ref}
                defaultEvents={[allDay("a", "2026-11-26", "2026-11-27")]}
                defaultView="week"
                defaultDate="2026-12-10"
                settings={SETTINGS}
                now={() => NOW}
            >
                <Shown />
            </Calendar.Root>,
        );
        expect(screen.getByText(/^week 2026-12-06/)).toBeTruthy();
        const model = ref.current?.model;
        expect(model?.state.events.map((event) => event.id)).toEqual(["a"]);
        rerender(
            <Calendar.Root
                calendarRef={ref}
                defaultEvents={[]}
                defaultView="month"
                settings={SETTINGS}
                now={() => NOW}
            >
                <Shown />
            </Calendar.Root>,
        );
        expect(ref.current?.model).toBe(model);
        expect(model?.state.events).toHaveLength(1);
        expect(model?.state.view.type).toBe("week");
    });
});

/** A controlled list kept in state, fed back from `onEventsChange`, with a button that adds one. */
function Controlled(props: {
    initial: CalendarEventJson[];
    calendarRef: CalendarRef;
    onChange?: (events: readonly CalendarEventOf[]) => void;
}) {
    const [events, setEvents] = React.useState<
        readonly (CalendarEventJson | CalendarEventOf)[]
    >(props.initial);
    return (
        <>
            <button
                type="button"
                onClick={() =>
                    setEvents([...events, timed("added", "13:00", "14:00")])
                }
            >
                add
            </button>
            <Calendar.Root
                calendarRef={props.calendarRef}
                events={events}
                onEventsChange={(next) => {
                    props.onChange?.(next);
                    setEvents(next);
                }}
                settings={SETTINGS}
                now={() => NOW}
                defaultView="month"
            >
                <MonthGrid />
            </Calendar.Root>
        </>
    );
}

describe("controlled events", () => {
    it("replace the model's events with a new list, unreported", () => {
        const onChange = vi.fn();
        const ref = createCalendarRef();
        render(
            <Controlled
                calendarRef={ref}
                initial={[allDay("a", "2026-11-26", "2026-11-27")]}
                onChange={onChange}
            />,
        );
        act(() => screen.getByText("add").click());
        expect(
            ref.current?.model.state.events.map((event) => event.id),
        ).toEqual(["a", "added"]);
        expect(
            document.querySelectorAll('[data-calendar-part="segment"]'),
        ).toHaveLength(2);
        // the controlled list's own command is not reported back
        expect(onChange).not.toHaveBeenCalled();
    });

    it("report the model's own changes, and run nothing for the list reported back", () => {
        const onChange = vi.fn();
        const ref = createCalendarRef();
        render(
            <Controlled
                calendarRef={ref}
                initial={[timed("t", "09:00", "10:00")]}
                onChange={onChange}
            />,
        );
        const model = ref.current?.model;
        const commands: string[] = [];
        model?.subscribe((event) => commands.push(event.command));
        act(() => {
            model?.run("event.move", { eventId: "t", delta: { minutes: 30 } });
        });
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0]?.[0]).toBe(model?.state.events);
        // the app set the reported list as its state: the root ran no set-all for it
        expect(commands).toEqual(["event.move"]);
    });

    it("warn when a list cannot be applied, the model's events staying", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const ref = createCalendarRef();
        const root = (events: CalendarEventJson[]) => (
            <Calendar.Root
                calendarRef={ref}
                events={events}
                settings={SETTINGS}
                now={() => NOW}
            />
        );
        const { rerender } = render(
            root([allDay("a", "2026-11-26", "2026-11-27")]),
        );
        rerender(root([allDay("a", "2026-11-27", "2026-11-26")]));
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("a controlled prop was not applied"),
        );
        expect(ref.current?.model.state.events[0]?.start).toBe("2026-11-26");
        warn.mockRestore();
    });
});

/** A root whose view and date are controlled. */
function Navigated(props: {
    view: "month" | "week";
    date: string;
    onViewChange: (view: RootView) => void;
    onDateChange: (date: string) => void;
}) {
    return (
        <Calendar.Root
            view={props.view}
            date={props.date}
            onViewChange={props.onViewChange}
            onDateChange={props.onDateChange}
            settings={SETTINGS}
            now={() => NOW}
        >
            <Shown />
            <Calendar.Next data-testid="next" />
            <Calendar.ViewButton view="days" days={3} data-testid="days" />
        </Calendar.Root>
    );
}
describe("controlled view and date", () => {
    it("bring the model to the props, and report the user's navigation", () => {
        const onViewChange = vi.fn();
        const onDateChange = vi.fn();
        const { rerender } = render(
            <Navigated
                view="month"
                date="2026-11-26"
                onViewChange={onViewChange}
                onDateChange={onDateChange}
            />,
        );
        expect(
            screen.getByText(/^month 2026-11-01 November 2026$/),
        ).toBeTruthy();
        rerender(
            <Navigated
                view="week"
                date="2026-11-26"
                onViewChange={onViewChange}
                onDateChange={onDateChange}
            />,
        );
        expect(screen.getByText(/^week 2026-11-22/)).toBeTruthy();
        rerender(
            <Navigated
                view="week"
                date="2027-01-05"
                onViewChange={onViewChange}
                onDateChange={onDateChange}
            />,
        );
        expect(screen.getByText(/^week 2027-01-03/)).toBeTruthy();
        expect(onViewChange).not.toHaveBeenCalled();
        expect(onDateChange).not.toHaveBeenCalled();
        act(() => screen.getByTestId("next").click());
        expect(onDateChange).toHaveBeenCalledWith("2027-01-10");
        act(() => screen.getByTestId("days").click());
        expect(onViewChange).toHaveBeenCalledWith({ type: "days", days: 3 });
    });

    it("apply a changed settings value", () => {
        const ref = createCalendarRef();
        const { rerender } = render(
            <Calendar.Root
                calendarRef={ref}
                settings={SETTINGS}
                now={() => NOW}
            />,
        );
        rerender(
            <Calendar.Root
                calendarRef={ref}
                settings={{ ...SETTINGS, firstDayOfWeek: 1 }}
                now={() => NOW}
            />,
        );
        expect(ref.current?.model.state.settings.firstDayOfWeek).toBe(1);
    });
});

describe("features and the root", () => {
    it("warns when a feature's callback or part is given without its feature", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const model = modelOf([], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const props = { onSelect: () => {} } as Record<string, unknown>;
        render(<Calendar.Root model={model} {...props} />);
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("onSelect needs the selection feature"),
        );
        warn.mockRestore();
    });

    it("warns when the features prop changes after the model was created", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { rerender } = render(
            <Calendar.Root features={[]} settings={SETTINGS} now={() => NOW} />,
        );
        rerender(
            <Calendar.Root
                features={[selection()]}
                settings={SETTINGS}
                now={() => NOW}
            />,
        );
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("the features prop changed"),
        );
        warn.mockRestore();
    });

    it("creates its own model when a model prop is dropped after mount", () => {
        const model = modelOf();
        const ref = createCalendarRef();
        const { rerender } = render(
            <Calendar.Root model={model} calendarRef={ref} />,
        );
        expect(ref.current?.model).toBe(model);
        rerender(
            <Calendar.Root
                model={undefined}
                calendarRef={ref}
                settings={SETTINGS}
                now={() => NOW}
                defaultView="week"
            />,
        );
        expect(ref.current?.model).not.toBe(model);
        expect(ref.current?.model.state.view.type).toBe("week");
    });

    it("gives a calendar ref the model and an engine that answers before the root mounts", () => {
        const ref = createCalendarRef();
        expect(ref.current).toBeNull();
        const { unmount } = render(
            <Calendar.Root
                calendarRef={ref}
                settings={SETTINGS}
                now={() => NOW}
            />,
        );
        expect(ref.current?.engine.get("focused")).toBeNull();
        expect(
            ref.current?.engine.run("focus", { date: "2026-11-26" }).ok,
        ).toBe(true);
        unmount();
        expect(ref.current).toBeNull();
    });
});
