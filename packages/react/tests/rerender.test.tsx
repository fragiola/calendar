// Moving one event re-renders only the rows and columns it touches (D11: the layout keeps the other
// rows' objects). The collection parts call their children function again only for an entity whose
// layout object changed, and read the function through a ref: an app's new inline function (a
// re-render of the app) does not re-render the unchanged rows either.
import { act, render } from "@testing-library/react";
import type * as React from "react";
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

/** A month whose rows count their renders. */
function Month(props: { tag: number; count: (id: string) => void }) {
    return (
        <Calendar.DayGrid data-tag={props.tag}>
            <Calendar.Weeks>
                {(week) => {
                    props.count(week.id);
                    return (
                        <Calendar.Week week={week}>
                            {(day) => (
                                <Calendar.Day day={day}>
                                    <Calendar.DayEvents>
                                        {(segment) => (
                                            <Calendar.Segment
                                                segment={segment}
                                            />
                                        )}
                                    </Calendar.DayEvents>
                                </Calendar.Day>
                            )}
                        </Calendar.Week>
                    );
                }}
            </Calendar.Weeks>
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
        // the app renders again, with a new children function: no row changed
        rerender(app(2));
        expect(weeks.changed(before)).toEqual([]);
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
});
