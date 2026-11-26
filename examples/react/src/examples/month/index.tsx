"use client";

import {
    Calendar,
    createCalendarModel,
    type Segment,
    useCalendar,
    useCalendarTitle,
    useCalendarView,
    useDayHeader,
} from "@fragiola/calendar-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { dayText, text, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

// A month: the toolbar runs the view commands, the grid is yours to assemble. Days show as many
// events as fit (`dayMaxEvents: "auto"`, measured by the engine); "+N more" opens that day as an
// agenda (the list of any view's days), and "Month" goes back.
export default function Month() {
    const [model] = useState(() =>
        createCalendarModel<Types>({
            version: 1,
            events: teamWeek(),
            calendars: CALENDARS,
            settings: { dayMaxEvents: "auto" },
            view: { type: "month", anchorDate: day() },
        }),
    );
    return (
        <Calendar.Root
            model={model}
            className={styles.root}
            onMoreClick={({ date }) => {
                model.run("view.set", { type: "day" });
                model.run("view.go-to", { date });
            }}
        >
            <Toolbar />
            <MonthOrDay />
        </Calendar.Root>
    );
}

// The month's grid, or the day "+N more" opened, as a list.
function MonthOrDay() {
    const { type } = useCalendarView();
    if (type === "day") return <DayAgenda />;
    return (
        <Calendar.DayGrid aria-label="Month" className={styles.grid}>
            <Calendar.ColumnHeaders className={styles.headers}>
                {(date) => <Weekday date={date} />}
            </Calendar.ColumnHeaders>
            <Calendar.Weeks>
                {(week) => (
                    <Calendar.Week week={week} className={styles.week}>
                        {(day) => (
                            <Calendar.Day day={day} className={styles.day}>
                                <div className={styles.dayHeader}>
                                    <span className={styles.dayNumber}>
                                        {Number(day.date.slice(8))}
                                    </span>
                                    <Calendar.More className={styles.more}>
                                        {({ hiddenCount }) =>
                                            `+${hiddenCount} more`
                                        }
                                    </Calendar.More>
                                </div>
                                <Calendar.DayEvents
                                    className={styles.dayEvents}
                                >
                                    {(segment) => (
                                        <EventSegment segment={segment} />
                                    )}
                                </Calendar.DayEvents>
                            </Calendar.Day>
                        )}
                    </Calendar.Week>
                )}
            </Calendar.Weeks>
        </Calendar.DayGrid>
    );
}

function DayAgenda() {
    const { model } = useCalendar<Types>();
    return (
        <Calendar.List className={styles.agenda}>
            <Calendar.ListDays>
                {(day) => (
                    <section key={day.date} className={styles.agendaDay}>
                        <h3 className={styles.agendaHeading}>
                            {dayText(day.date, model.state.settings.locale)}
                        </h3>
                        <Calendar.ListDay
                            day={day}
                            className={styles.agendaList}
                        >
                            {(item) => (
                                <Calendar.ListEvent
                                    item={item}
                                    className={styles.agendaItem}
                                >
                                    <span className={styles.agendaTime}>
                                        {item.allDay
                                            ? "all day"
                                            : timesOf(model, item.occurrenceId)}
                                    </span>
                                    <span>
                                        {titleOf(
                                            model,
                                            item.occurrenceId,
                                            item.eventId,
                                        )}
                                    </span>
                                </Calendar.ListEvent>
                            )}
                        </Calendar.ListDay>
                    </section>
                )}
            </Calendar.ListDays>
        </Calendar.List>
    );
}

// The title and the buttons: the title is data (`Intl` parts), the buttons run `view.previous`,
// `view.today` and `view.next`, disabled when the model cannot run them.
function Toolbar() {
    const title = useCalendarTitle();
    return (
        <div className={styles.toolbar}>
            <h2 className={styles.title}>{text(title)}</h2>
            <Calendar.Today className={styles.button}>Today</Calendar.Today>
            <Calendar.Previous
                aria-label="Previous month"
                className={styles.iconButton}
            >
                <ChevronLeft aria-hidden className={styles.flip} />
            </Calendar.Previous>
            <Calendar.Next
                aria-label="Next month"
                className={styles.iconButton}
            >
                <ChevronRight aria-hidden className={styles.flip} />
            </Calendar.Next>
            <Calendar.ViewButton view="month" className={styles.button}>
                Month
            </Calendar.ViewButton>
        </div>
    );
}

function Weekday({ date }: { date: string }) {
    const parts = useDayHeader(date, { weekday: "short" });
    return (
        <Calendar.ColumnHeader date={date} className={styles.header}>
            {text(parts)}
        </Calendar.ColumnHeader>
    );
}

// An event's part in a week: it places itself (its lane, its days); its title is the model's.
function EventSegment({ segment }: { segment: Segment }) {
    const { model } = useCalendar<Types>();
    return (
        <Calendar.Segment segment={segment} className={styles.segment}>
            <span className={styles.segmentLabel}>
                {titleOf(model, segment.occurrenceId, segment.eventId)}
            </span>
        </Calendar.Segment>
    );
}
