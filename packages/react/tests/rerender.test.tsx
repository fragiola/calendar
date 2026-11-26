// Moving one event re-renders only the rows and columns it touches (D11: the layout keeps the other
// rows' objects), when the children function is stable. React's contract: a collection part calls
// its children function again for an entity whose layout object changed, and for every entity when
// the function itself changed, so app state the function closes over is never stale.

import type { DayGridWeek } from "@fragiola/calendar";
import { act, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { Calendar } from "../src";
import { allDay, modelOf, timed } from "./calendar";

function counter() {
    const calls = new Map<string, number>();
    return {
        calls,
        count(key: string) {
            calls.set(key, (calls.get(key) ?? 0) + 1);
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

/** A month whose rows count their renders, its children function stable (`useCallback`). */
function Month(props: { tag: number; count: (id: string) => void }) {
    const { count } = props;
    const row = React.useCallback(
        (week: DayGridWeek) => {
            count(week.id);
            return (
                <Calendar.Week week={week}>
                    {(day) => (
                        <Calendar.Day day={day}>
                            <Calendar.DayEvents>
                                {(segment) => (
                                    <Calendar.Segment segment={segment} />
                                )}
                            </Calendar.DayEvents>
                        </Calendar.Day>
                    )}
                </Calendar.Week>
            );
        },
        [count],
    );
    return (
        <Calendar.DayGrid data-tag={props.tag}>
            <Calendar.Weeks>{row}</Calendar.Weeks>
        </Calendar.DayGrid>
    );
}

/** A month whose rows show a mark: a `useCallback`'d function that reads it. */
function MarkedMonth(props: {
    tag: number;
    mark: string;
    count: (id: string) => void;
}) {
    const { mark, count } = props;
    const row = React.useCallback(
        (week: DayGridWeek) => {
            count(week.id);
            return <Calendar.Week week={week} data-mark={mark} />;
        },
        [mark, count],
    );
    return (
        <Calendar.DayGrid data-tag={props.tag}>
            <Calendar.Weeks>{row}</Calendar.Weeks>
        </Calendar.DayGrid>
    );
}

describe("re-rendering what changed", () => {
    it("re-renders the week rows an event moves between, not the others", () => {
        const model = modelOf(
            [
                allDay("a", "2026-11-03", "2026-11-04"),
                allDay("b", "2026-11-17", "2026-11-18"),
            ],
            { view: { type: "month", anchorDate: "2026-11-26" } },
        );
        const weeks = counter();
        const app = (tag: number): React.ReactElement => (
            <Calendar.Root model={model}>
                <Month tag={tag} count={weeks.count} />
            </Calendar.Root>
        );
        const { rerender } = render(app(1));
        expect(weeks.calls.size).toBe(6);
        let before = weeks.snapshot();
        act(() => {
            model.run("event.move", { eventId: "a", delta: { days: 7 } });
        });
        // the row it left and the row it entered
        expect(weeks.changed(before)).toEqual(["2026-11-01", "2026-11-08"]);
        before = weeks.snapshot();
        // the app renders again, with the same children function: no row changed
        rerender(app(2));
        expect(weeks.changed(before)).toEqual([]);
    });

    it("calls a new children function again for every row, so the state it shows is current", () => {
        const model = modelOf(
            [
                allDay("a", "2026-11-03", "2026-11-04"),
                allDay("b", "2026-11-17", "2026-11-18"),
            ],
            { view: { type: "month", anchorDate: "2026-11-26" } },
        );
        // an app highlights one event: the inline children function closes over it
        const app = (highlighted: string): React.ReactElement => (
            <Calendar.Root model={model}>
                <Calendar.DayGrid>
                    <Calendar.Weeks>
                        {(week) => (
                            <Calendar.Week week={week}>
                                {(day) => (
                                    <Calendar.Day day={day}>
                                        <Calendar.DayEvents>
                                            {(segment) => (
                                                <Calendar.Segment
                                                    segment={segment}
                                                    data-testid={
                                                        segment.eventId
                                                    }
                                                    data-highlighted={
                                                        segment.eventId ===
                                                        highlighted
                                                            ? ""
                                                            : undefined
                                                    }
                                                />
                                            )}
                                        </Calendar.DayEvents>
                                    </Calendar.Day>
                                )}
                            </Calendar.Week>
                        )}
                    </Calendar.Weeks>
                </Calendar.DayGrid>
            </Calendar.Root>
        );
        const { rerender } = render(app("a"));
        expect(screen.getByTestId("a").hasAttribute("data-highlighted")).toBe(
            true,
        );
        expect(screen.getByTestId("b").hasAttribute("data-highlighted")).toBe(
            false,
        );
        rerender(app("b"));
        expect(screen.getByTestId("a").hasAttribute("data-highlighted")).toBe(
            false,
        );
        expect(screen.getByTestId("b").hasAttribute("data-highlighted")).toBe(
            true,
        );
    });

    it("re-renders every row when the children function changes", () => {
        const model = modelOf([allDay("a", "2026-11-03", "2026-11-04")], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const weeks = counter();
        const app = (tag: number): React.ReactElement => (
            <Calendar.Root model={model}>
                <Calendar.DayGrid>
                    <Calendar.Weeks>
                        {(week) => {
                            weeks.count(week.id);
                            return <Calendar.Week week={week} data-tag={tag} />;
                        }}
                    </Calendar.Weeks>
                </Calendar.DayGrid>
            </Calendar.Root>
        );
        const { rerender } = render(app(1));
        const before = weeks.snapshot();
        rerender(app(2));
        expect(weeks.changed(before)).toHaveLength(6);
    });

    it("re-renders the time-grid column an event moves in, not the others", () => {
        const model = modelOf(
            [
                timed("t", "09:00", "10:00"),
                timed("u", "09:00", "10:00", "2026-11-24"),
            ],
            { view: { type: "week", anchorDate: "2026-11-26" } },
        );
        const columns = counter();
        const slots = counter();
        render(
            <Calendar.Root model={model}>
                <Calendar.TimeGrid>
                    <Calendar.SlotRows>
                        {(slot) => {
                            slots.count(slot.time);
                            return (
                                <Calendar.SlotRow slot={slot}>
                                    {(column) => (
                                        <Calendar.Slot date={column.date} />
                                    )}
                                </Calendar.SlotRow>
                            );
                        }}
                    </Calendar.SlotRows>
                    <Calendar.Columns>
                        {(column) => {
                            columns.count(column.date);
                            return (
                                <Calendar.Column column={column}>
                                    <Calendar.ColumnEvents>
                                        {(segment) => (
                                            <Calendar.TimeEvent
                                                segment={segment}
                                            />
                                        )}
                                    </Calendar.ColumnEvents>
                                </Calendar.Column>
                            );
                        }}
                    </Calendar.Columns>
                </Calendar.TimeGrid>
            </Calendar.Root>,
        );
        const before = columns.snapshot();
        const slotsBefore = slots.snapshot();
        act(() => {
            model.run("event.move", { eventId: "t", delta: { minutes: 60 } });
        });
        expect(columns.changed(before)).toEqual(["2026-11-26"]);
        expect(slots.changed(slotsBefore)).toEqual([]);
    });

    it("calls a new children function again for every column, slot row, header and list day", () => {
        const week = modelOf([timed("t", "09:00", "10:00")], {
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        const calls = counter();
        const grid = (tag: number): React.ReactElement => (
            <Calendar.Root model={week}>
                <Calendar.TimeGrid data-tag={tag}>
                    <Calendar.ColumnHeaders>
                        {(date) => {
                            calls.count(`header ${date}`);
                            return <Calendar.ColumnHeader date={date} />;
                        }}
                    </Calendar.ColumnHeaders>
                    <Calendar.SlotRows>
                        {(slot) => {
                            calls.count(`slot ${slot.time}`);
                            return <Calendar.SlotRow slot={slot} />;
                        }}
                    </Calendar.SlotRows>
                    <Calendar.Columns>
                        {(column) => {
                            calls.count(`column ${column.date}`);
                            return <Calendar.Column column={column} />;
                        }}
                    </Calendar.Columns>
                </Calendar.TimeGrid>
            </Calendar.Root>
        );
        const { rerender, unmount } = render(grid(1));
        const before = calls.snapshot();
        rerender(grid(2));
        const changed = calls.changed(before);
        expect(changed.filter((key) => key.startsWith("header"))).toHaveLength(
            7,
        );
        expect(changed.filter((key) => key.startsWith("column"))).toHaveLength(
            7,
        );
        expect(changed.filter((key) => key.startsWith("slot"))).toHaveLength(
            48,
        );
        unmount();

        const list = modelOf([timed("t", "09:00", "10:00")], {
            view: { type: "list", anchorDate: "2026-11-26" },
        });
        const days = counter();
        const agenda = (tag: number): React.ReactElement => (
            <Calendar.Root model={list}>
                <Calendar.List data-tag={tag}>
                    <Calendar.ListDays>
                        {(day) => {
                            days.count(day.date);
                            return (
                                <Calendar.ListDay day={day}>
                                    {() => null}
                                </Calendar.ListDay>
                            );
                        }}
                    </Calendar.ListDays>
                </Calendar.List>
            </Calendar.Root>
        );
        const second = render(agenda(1));
        const listBefore = days.snapshot();
        expect(listBefore.size).toBeGreaterThan(0);
        second.rerender(agenda(2));
        expect(days.changed(listBefore)).toHaveLength(listBefore.size);
    });

    it("keeps a useCallback'd function until what it reads changes", () => {
        const model = modelOf([allDay("a", "2026-11-03", "2026-11-04")], {
            view: { type: "month", anchorDate: "2026-11-26" },
        });
        const weeks = counter();
        const app = (tag: number, mark: string): React.ReactElement => (
            <Calendar.Root model={model}>
                <MarkedMonth tag={tag} mark={mark} count={weeks.count} />
            </Calendar.Root>
        );
        const { rerender } = render(app(1, "x"));
        let before = weeks.snapshot();
        rerender(app(2, "x"));
        expect(weeks.changed(before)).toEqual([]);
        before = weeks.snapshot();
        rerender(app(3, "y"));
        expect(weeks.changed(before)).toHaveLength(6);
    });
});
