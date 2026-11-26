// The tests' calendar: a model on a fixed clock (2026-11-26 12:00 UTC, a Thursday) in UTC with
// Sunday first, and an app that renders every primitive of the view it shows, as an app would.
import type * as React from "react";
import {
    Calendar,
    type CalendarEventJson,
    type CalendarFeatures,
    type CalendarSettingsJson,
    createCalendarModel,
    type ViewJson,
} from "../src";
import { DragPreview } from "../src/drag-and-drop";
import { ResizeHandle } from "../src/resize";
import { Selection } from "../src/selection";

export const NOW = Date.UTC(2026, 10, 26, 12);

/** An all-day event (end exclusive). */
export function allDay(
    id: string,
    start: string,
    end: string,
): CalendarEventJson {
    return { id, title: id, start, end, allDay: true };
}

/** A timed event at `HH:mm` times on a day, in UTC. */
export function timed(
    id: string,
    start: string,
    end: string,
    date = "2026-11-26",
): CalendarEventJson {
    return {
        id,
        title: id,
        start: `${date}T${start}:00Z`,
        end: `${date}T${end}:00Z`,
        allDay: false,
    };
}

export const SETTINGS: CalendarSettingsJson = {
    timeZone: "UTC",
    firstDayOfWeek: 0,
};

/** A model of events on the fixed clock. */
export function modelOf<const F extends CalendarFeatures = readonly []>(
    events: CalendarEventJson[] = [],
    options: {
        view?: ViewJson;
        settings?: CalendarSettingsJson;
        features?: F;
    } = {},
) {
    return createCalendarModel(
        {
            version: 1,
            events,
            settings: { ...SETTINGS, ...options.settings },
            ...(options.view ? { view: options.view } : {}),
        },
        { now: () => NOW, features: options.features },
    );
}

/** A month: weekday headers, weeks with week numbers, days, their events and "+N more". */
export function MonthGrid(props: { features?: boolean }) {
    return (
        <Calendar.DayGrid>
            <Calendar.ColumnHeaders>
                {(date) => <Calendar.ColumnHeader date={date} />}
            </Calendar.ColumnHeaders>
            <Calendar.Weeks>
                {(week) => (
                    <Calendar.Week week={week}>
                        <Calendar.WeekNumber />
                        <Calendar.Days>
                            {(day) => (
                                <Calendar.Day day={day}>
                                    <Calendar.DayEvents>
                                        {(segment) => (
                                            <Calendar.Segment segment={segment}>
                                                {props.features ? (
                                                    <ResizeHandle edge="end" />
                                                ) : null}
                                            </Calendar.Segment>
                                        )}
                                    </Calendar.DayEvents>
                                    <Calendar.More />
                                </Calendar.Day>
                            )}
                        </Calendar.Days>
                        {props.features ? (
                            <>
                                <Selection />
                                <DragPreview />
                            </>
                        ) : null}
                    </Calendar.Week>
                )}
            </Calendar.Weeks>
        </Calendar.DayGrid>
    );
}

/** A time grid: headers, the all-day row, slot rows with labels, and the columns' layer. */
export function TimeGridView(props: {
    features?: boolean;
    columnChildren?: React.ReactNode;
}) {
    return (
        <Calendar.TimeGrid>
            <Calendar.ColumnHeaders>
                {(date) => <Calendar.ColumnHeader date={date} />}
            </Calendar.ColumnHeaders>
            <Calendar.AllDayRow>
                {(day) => (
                    <Calendar.Day day={day}>
                        <Calendar.DayEvents>
                            {(segment) => (
                                <Calendar.Segment segment={segment} />
                            )}
                        </Calendar.DayEvents>
                    </Calendar.Day>
                )}
            </Calendar.AllDayRow>
            <Calendar.Scroller>
                <Calendar.SlotRows>
                    {(slot) => (
                        <Calendar.SlotRow slot={slot}>
                            <Calendar.SlotLabel />
                            <Calendar.Slots>
                                {(column) => (
                                    <Calendar.Slot date={column.date} />
                                )}
                            </Calendar.Slots>
                        </Calendar.SlotRow>
                    )}
                </Calendar.SlotRows>
                <Calendar.Columns>
                    {(column) => (
                        <Calendar.Column column={column}>
                            <Calendar.ColumnEvents>
                                {(segment) => (
                                    <Calendar.TimeEvent segment={segment}>
                                        {props.features ? (
                                            <ResizeHandle edge="end" />
                                        ) : null}
                                    </Calendar.TimeEvent>
                                )}
                            </Calendar.ColumnEvents>
                            {props.features ? (
                                <>
                                    <Selection />
                                    <DragPreview />
                                </>
                            ) : null}
                            {props.columnChildren}
                        </Calendar.Column>
                    )}
                </Calendar.Columns>
            </Calendar.Scroller>
        </Calendar.TimeGrid>
    );
}

/** A list view: a heading of the app's per day, then its events. */
export function ListView() {
    return (
        <Calendar.List>
            <Calendar.ListDays>
                {(day) => (
                    <Calendar.ListDay day={day}>
                        {(item) => <Calendar.ListEvent item={item} />}
                    </Calendar.ListDay>
                )}
            </Calendar.ListDays>
        </Calendar.List>
    );
}

/** The navigation buttons. */
export function Toolbar() {
    return (
        <>
            <Calendar.Previous />
            <Calendar.Today />
            <Calendar.Next />
            <Calendar.ViewButton view="month" />
            <Calendar.ViewButton view="week" />
        </>
    );
}
