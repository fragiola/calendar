"use client";

import {
    Calendar,
    type CalendarEventJson,
    createCalendarModel,
    type Segment,
    type TimeSegment,
    useCalendar,
    useCalendarTitle,
    useCalendarView,
    useDayHeader,
} from "@fragiola/calendar-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { allDay, at, CALENDARS, day, type Types, weekday } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

// Events that are longer than a day. All-day ends are exclusive (a one-day event ends the next
// day); a timed event crossing midnight shows on both days. A segment is an event's part in one
// row: `continuesBefore` and `continuesAfter` say when it goes on in another row, and the
// segments draw it (square ends, an arrow).
const EVENTS: CalendarEventJson<Types>[] = [
    allDay("holiday", "Public holiday", weekday(4), 1, "company"),
    allDay("sprint", "Design sprint", weekday(3), 5, "grace"),
    allDay(
        "vacation",
        "Katherine on vacation",
        weekday(4, -1),
        10,
        "katherine",
    ),
    allDay("conference", "Conference in Lisbon", weekday(1, 1), 3, "alan"),
    {
        id: "release",
        kind: "meeting",
        title: "Release night",
        start: at(weekday(2), "22:00"),
        end: at(weekday(3), "02:00"),
        allDay: false,
        calendarId: "ada",
    },
    {
        id: "flight",
        kind: "trip",
        title: "Flight to Lisbon",
        start: at(weekday(0, 1), "20:00"),
        end: at(weekday(1, 1), "06:30"),
        allDay: false,
        calendarId: "alan",
    },
];

export default function AllDayAndMultiDay() {
    const [model] = useState(() =>
        createCalendarModel<Types>({
            version: 1,
            events: EVENTS,
            calendars: CALENDARS,
            settings: {},
            view: { type: "month", anchorDate: day() },
        }),
    );
    return (
        <Calendar.Root model={model} className={styles.root}>
            <Toolbar />
            <View />
        </Calendar.Root>
    );
}

function View() {
    const { type } = useCalendarView();
    return type === "month" ? <Month /> : <Week />;
}

function Toolbar() {
    const title = useCalendarTitle();
    return (
        <div className={styles.toolbar}>
            <h2 className={styles.title}>{text(title)}</h2>
            <Calendar.Today className={styles.button}>Today</Calendar.Today>
            <Calendar.Previous
                aria-label="Previous"
                className={styles.iconButton}
            >
                <ChevronLeft aria-hidden className={styles.flip} />
            </Calendar.Previous>
            <Calendar.Next aria-label="Next" className={styles.iconButton}>
                <ChevronRight aria-hidden className={styles.flip} />
            </Calendar.Next>
            <fieldset aria-label="View" className={styles.views}>
                <Calendar.ViewButton view="month" className={styles.viewButton}>
                    Month
                </Calendar.ViewButton>
                <Calendar.ViewButton view="week" className={styles.viewButton}>
                    Week
                </Calendar.ViewButton>
            </fieldset>
        </div>
    );
}

function Weekday({
    date,
    format,
}: {
    date: string;
    format?: Intl.DateTimeFormatOptions;
}) {
    const parts = useDayHeader(date, format);
    return (
        <Calendar.ColumnHeader date={date} className={styles.header}>
            {text(parts)}
        </Calendar.ColumnHeader>
    );
}

function Month() {
    return (
        <Calendar.DayGrid aria-label="Month" className={styles.grid}>
            <Calendar.ColumnHeaders className={styles.monthHeaders}>
                {(date) => (
                    <Weekday date={date} format={{ weekday: "short" }} />
                )}
            </Calendar.ColumnHeaders>
            <Calendar.Weeks>
                {(week) => (
                    <Calendar.Week week={week} className={styles.week}>
                        {(day) => (
                            <Calendar.Day day={day} className={styles.day}>
                                <span className={styles.dayNumber}>
                                    {Number(day.date.slice(8))}
                                </span>
                                <Calendar.DayEvents
                                    className={styles.dayEvents}
                                >
                                    {(segment) => <Bar segment={segment} />}
                                </Calendar.DayEvents>
                            </Calendar.Day>
                        )}
                    </Calendar.Week>
                )}
            </Calendar.Weeks>
        </Calendar.DayGrid>
    );
}

function Week() {
    return (
        <Calendar.TimeGrid aria-label="Week" className={styles.grid}>
            <Calendar.ColumnHeaders className={styles.weekHeaders}>
                {(date) => <Weekday date={date} />}
            </Calendar.ColumnHeaders>
            <Calendar.AllDayRow className={styles.allDayRow}>
                <div aria-hidden className={styles.allDayLabel}>
                    all-day
                </div>
                <Calendar.Days>
                    {(day) => (
                        <Calendar.Day day={day} className={styles.allDayCell}>
                            <Calendar.DayEvents>
                                {(segment) => <Bar segment={segment} />}
                            </Calendar.DayEvents>
                        </Calendar.Day>
                    )}
                </Calendar.Days>
            </Calendar.AllDayRow>
            <Calendar.Scroller className={styles.scroller}>
                <div className={styles.body}>
                    <Calendar.SlotRows>
                        {(slot) => (
                            <Calendar.SlotRow
                                slot={slot}
                                className={styles.slotRow}
                            >
                                <Calendar.SlotLabel
                                    className={styles.slotLabel}
                                >
                                    {slot.time.endsWith(":00")
                                        ? slot.time
                                        : null}
                                </Calendar.SlotLabel>
                                <Calendar.Slots>
                                    {(column) => (
                                        <Calendar.Slot
                                            date={column.date}
                                            className={styles.slot}
                                        />
                                    )}
                                </Calendar.Slots>
                            </Calendar.SlotRow>
                        )}
                    </Calendar.SlotRows>
                    <Calendar.Columns className={styles.columns}>
                        {(column) => (
                            <Calendar.Column
                                column={column}
                                className={styles.column}
                            >
                                <Calendar.ColumnEvents>
                                    {(segment) => <Timed segment={segment} />}
                                </Calendar.ColumnEvents>
                            </Calendar.Column>
                        )}
                    </Calendar.Columns>
                </div>
            </Calendar.Scroller>
        </Calendar.TimeGrid>
    );
}

// A day-grid segment: square ends where the event goes on in another row, an arrow there.
function Bar({ segment }: { segment: Segment }) {
    const { model } = useCalendar<Types>();
    return (
        <Calendar.Segment segment={segment} className={styles.segment}>
            <span className={styles.bar}>
                {segment.continuesBefore ? (
                    <ChevronLeft aria-hidden className={styles.arrow} />
                ) : null}
                <span className={styles.barTitle}>
                    {titleOf(model, segment.occurrenceId, segment.eventId)}
                </span>
                {segment.continuesAfter ? (
                    <ChevronRight aria-hidden className={styles.arrow} />
                ) : null}
            </span>
        </Calendar.Segment>
    );
}

// A timed segment: a night event is split per column; each part says it goes on.
function Timed({ segment }: { segment: TimeSegment }) {
    const { model } = useCalendar<Types>();
    return (
        <Calendar.TimeEvent segment={segment} className={styles.event}>
            <span className={styles.eventBox}>
                <span className={styles.eventTitle}>
                    {titleOf(model, segment.occurrenceId, segment.eventId)}
                </span>
                <span className={styles.eventTime}>
                    {timesOf(model, segment.occurrenceId)}
                </span>
            </span>
        </Calendar.TimeEvent>
    );
}
