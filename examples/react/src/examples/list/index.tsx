"use client";

import {
    Calendar,
    createCalendarModel,
    type ListItem,
    useCalendar,
    useCalendarTitle,
} from "@fragiola/calendar-react";
import { CalendarX, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { dayText, text, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

// An agenda: the list view shows the month's days that have events, each under a heading you
// write (the day is data), its events as a list. A month without events is `state.empty`: what
// it shows then is yours too.
export default function List() {
    const [model] = useState(() =>
        createCalendarModel<Types>({
            version: 1,
            events: teamWeek(),
            calendars: CALENDARS,
            settings: {},
            view: { type: "list", anchorDate: day() },
        }),
    );
    return (
        <Calendar.Root model={model} className={styles.root}>
            <Toolbar />
            <Calendar.List className={styles.list}>
                {({ empty }) =>
                    empty ? (
                        <div className={styles.empty}>
                            <CalendarX
                                aria-hidden
                                className={styles.emptyIcon}
                            />
                            <p>Nothing planned this month.</p>
                        </div>
                    ) : (
                        <Calendar.ListDays>
                            {(day) => (
                                <section key={day.date} className={styles.day}>
                                    <h3
                                        id={`list-${day.date}`}
                                        className={styles.dayHeading}
                                    >
                                        {dayText(
                                            day.date,
                                            model.state.settings.locale,
                                        )}
                                    </h3>
                                    {/* the day's list is named by its heading */}
                                    <Calendar.ListDay
                                        day={day}
                                        aria-labelledby={`list-${day.date}`}
                                        className={styles.events}
                                    >
                                        {(item) => <Item item={item} />}
                                    </Calendar.ListDay>
                                </section>
                            )}
                        </Calendar.ListDays>
                    )
                }
            </Calendar.List>
        </Calendar.Root>
    );
}

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
        </div>
    );
}

// An event of the list: a tab stop of its own; its times and title are the model's data.
function Item({ item }: { item: ListItem }) {
    const { model } = useCalendar<Types>();
    return (
        <Calendar.ListEvent item={item} className={styles.item}>
            <span aria-hidden className={styles.dot} />
            <span className={styles.time}>
                {item.allDay ? "All day" : timesOf(model, item.occurrenceId)}
            </span>
            <span className={styles.itemTitle}>
                {titleOf(model, item.occurrenceId, item.eventId)}
            </span>
        </Calendar.ListEvent>
    );
}
