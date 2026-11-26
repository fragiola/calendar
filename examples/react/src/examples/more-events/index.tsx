"use client";

import {
    Calendar,
    type CalendarEventJson,
    createCalendarModel,
    type Segment,
    useCalendar,
    useCalendarTitle,
    useDayHeader,
} from "@fragiola/calendar-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createContext, useContext, useState } from "react";
import { Popover } from "#/components/ui/popover";
import {
    CALENDARS,
    day,
    type Types,
    teamWeek,
    timed,
    weekday,
} from "../_kit/data";
import { dayText, text, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

// The day whose popover is open: app state the days read through a context (a day's children
// function is called again only when its layout changes, so it never closes over app state).
const OpenDay = createContext<{
    date: string | null;
    setDate: (date: string | null) => void;
}>({ date: null, setDate: () => {} });

/** A busy month: the team's week, and a standup and a review every weekday of four weeks. */
function busyMonth(): CalendarEventJson<Types>[] {
    const days = [-2, -1, 0, 1].flatMap((weeks) =>
        [1, 2, 3, 4, 5].map((weekdayNumber) => weekday(weekdayNumber, weeks)),
    );
    return [
        ...teamWeek(),
        ...days.flatMap((date) => [
            timed(`standup-${date}`, "Standup", date, "09:00", "09:15", "ada"),
            timed(
                `review-${date}`,
                "Code review",
                date,
                "16:00",
                "16:30",
                "alan",
            ),
        ]),
    ];
}

// A busy month that shows two events a day (`dayMaxEvents: 2`). "+N more" is Calendar.More,
// the trigger of Fragiola UI's popover (`render`), which lists the day's events. A press on it,
// Enter on it (it is the last item of the day's events on the keyboard) or an assistive click is
// the engine's `more-click`: the popover opens from `onMoreClick`.
export default function MoreEvents() {
    const [model] = useState(() =>
        createCalendarModel<Types>({
            version: 1,
            events: busyMonth(),
            calendars: CALENDARS,
            settings: { dayMaxEvents: 2 },
            view: { type: "month", anchorDate: day() },
        }),
    );
    const [date, setDate] = useState<string | null>(null);
    return (
        <OpenDay value={{ date, setDate }}>
            <Calendar.Root
                model={model}
                className={styles.root}
                onMoreClick={(event) => setDate(event.date)}
            >
                <Toolbar />
                <Calendar.DayGrid aria-label="Month" className={styles.grid}>
                    <Calendar.ColumnHeaders className={styles.headers}>
                        {(date) => <Weekday date={date} />}
                    </Calendar.ColumnHeaders>
                    <Calendar.Weeks>
                        {(week) => (
                            <Calendar.Week week={week} className={styles.week}>
                                {(day) => (
                                    <Calendar.Day
                                        day={day}
                                        className={styles.day}
                                    >
                                        <span className={styles.dayNumber}>
                                            {Number(day.date.slice(8))}
                                        </span>
                                        <Calendar.DayEvents
                                            className={styles.dayEvents}
                                        >
                                            {(segment) => (
                                                <EventSegment
                                                    segment={segment}
                                                />
                                            )}
                                        </Calendar.DayEvents>
                                        <MorePopover date={day.date} />
                                    </Calendar.Day>
                                )}
                            </Calendar.Week>
                        )}
                    </Calendar.Weeks>
                </Calendar.DayGrid>
            </Calendar.Root>
        </OpenDay>
    );
}

// The popover of a day: its trigger is the day's "+N more" (rendered only while some events do
// not fit). The engine's `more-click` opens it; a press on the trigger is that click, so the
// trigger's own toggle is cancelled, and Escape or a press outside close it.
function MorePopover({ date }: { date: string }) {
    const open = useContext(OpenDay);
    const { model } = useCalendar<Types>();
    const items =
        model.get("list").days.find((one) => one.date === date)?.items ?? [];
    return (
        <Popover.Root
            open={open.date === date}
            onOpenChange={(next, details) => {
                if (details.reason === "trigger-press") details.cancel();
                else if (!next) open.setDate(null);
            }}
        >
            <Popover.Trigger
                render={
                    <Calendar.More className={styles.more}>
                        {({ hiddenCount }) => `+${hiddenCount} more`}
                    </Calendar.More>
                }
            />
            <Popover.Content
                align="start"
                sideOffset={4}
                className={styles.popover}
            >
                <div className={styles.popoverBody}>
                    <Popover.Title className={styles.popoverTitle}>
                        {dayText(date, model.state.settings.locale)}
                    </Popover.Title>
                    <ul className={styles.popoverList}>
                        {items.map((item) => (
                            <li
                                key={item.occurrenceId}
                                className={styles.popoverItem}
                            >
                                <span className={styles.popoverTime}>
                                    {item.allDay
                                        ? "All day"
                                        : timesOf(model, item.occurrenceId)}
                                </span>
                                <span className={styles.popoverEventTitle}>
                                    {titleOf(
                                        model,
                                        item.occurrenceId,
                                        item.eventId,
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </Popover.Content>
        </Popover.Root>
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

function Weekday({ date }: { date: string }) {
    const parts = useDayHeader(date, { weekday: "short" });
    return (
        <Calendar.ColumnHeader date={date} className={styles.header}>
            {text(parts)}
        </Calendar.ColumnHeader>
    );
}

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
