"use client";

import {
    Calendar,
    type CalendarEventJson,
    type CalendarEventOf,
    createCalendarModel,
    type TimeSegment,
    useCalendar,
    useCalendarTitle,
    useDayHeader,
} from "@fragiola/calendar-react";
import {
    Ban,
    ChevronLeft,
    ChevronRight,
    Crosshair,
    type LucideIcon,
    MapPin,
    Users,
    Video,
} from "lucide-react";
import { useState } from "react";
import { at, CALENDARS, day, type Palette, weekday } from "../_kit/data";
import { text, timesOf } from "../_kit/format";
import * as styles from "./styles";

// What this calendar's events hold, by kind: `event.data` narrows on `event.kind`, so a meeting
// has a room and attendees, a call its link, a focus block nothing. Every event may be cancelled.
type Types = {
    events: {
        meeting: { room: string; attendees: string[]; cancelled?: boolean };
        call: { link: string; attendees: string[]; cancelled?: boolean };
        focus: { cancelled?: boolean } | undefined;
    };
    calendar: { palette: Palette };
};

type EventOf = CalendarEventOf<Types>;

const EVENTS: CalendarEventJson<Types>[] = [
    {
        id: "planning",
        kind: "meeting",
        title: "Sprint planning",
        start: at(weekday(1), "10:00"),
        end: at(weekday(1), "11:30"),
        allDay: false,
        calendarId: "ada",
        data: { room: "Atlas", attendees: ["Ada", "Grace", "Alan"] },
    },
    {
        id: "customer",
        kind: "call",
        title: "Customer call",
        start: at(weekday(2), "13:00"),
        end: at(weekday(2), "14:00"),
        allDay: false,
        calendarId: "grace",
        data: {
            link: "meet.example.com/acme",
            attendees: ["Grace", "Katherine"],
        },
    },
    {
        id: "deep-work",
        kind: "focus",
        title: "Focus: billing API",
        start: at(weekday(3), "09:00"),
        end: at(weekday(3), "12:00"),
        allDay: false,
        calendarId: "alan",
    },
    {
        id: "design",
        kind: "meeting",
        title: "Design review",
        start: at(weekday(4), "14:00"),
        end: at(weekday(4), "15:30"),
        allDay: false,
        calendarId: "katherine",
        data: {
            room: "Lisbon",
            attendees: ["Katherine", "Ada"],
            cancelled: true,
        },
    },
    {
        id: "partner",
        kind: "call",
        title: "Partner sync",
        start: at(weekday(5), "10:00"),
        end: at(weekday(5), "11:00"),
        allDay: false,
        calendarId: "company",
        data: { link: "meet.example.com/partner", attendees: ["Alan"] },
    },
];

type Kind = keyof Types["events"];

/** Each kind's icon. */
const ICONS: Record<Kind, LucideIcon> = {
    meeting: Users,
    call: Video,
    focus: Crosshair,
};

/** Whether an event's data says it is cancelled (any kind may be). */
function cancelled(event: EventOf | undefined): boolean {
    return event?.data?.cancelled === true;
}

// Events drawn from their typed data: the event's element is the calendar's (it places itself,
// takes focus, carries its state), and everything inside it is yours.
export default function CustomEventContent() {
    const [model] = useState(() =>
        createCalendarModel<Types>({
            version: 1,
            events: EVENTS,
            calendars: CALENDARS,
            settings: { slotMinTime: "08:00", slotMaxTime: "18:00" },
            view: { type: "week", anchorDate: day() },
        }),
    );
    return (
        <Calendar.Root model={model} className={styles.root}>
            <Toolbar />
            <Calendar.TimeGrid aria-label="Week" className={styles.grid}>
                <Calendar.ColumnHeaders className={styles.headers}>
                    {(date) => <DayHeader date={date} />}
                </Calendar.ColumnHeaders>
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
                                        {slot.time.endsWith(":00") ? (
                                            <SlotTime time={slot.time} />
                                        ) : null}
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
                                        {(segment) => (
                                            <EventCard segment={segment} />
                                        )}
                                    </Calendar.ColumnEvents>
                                </Calendar.Column>
                            )}
                        </Calendar.Columns>
                    </div>
                </Calendar.Scroller>
            </Calendar.TimeGrid>
        </Calendar.Root>
    );
}

// The event's content, from its kind and data: an icon, the title, the times, the room or the
// call's link, the attendees' initials; a cancelled event says so in its name too.
function EventCard({ segment }: { segment: TimeSegment }) {
    const { model } = useCalendar<Types>();
    const event = model.get("event-by", { id: segment.eventId });
    if (!event) return null;
    const Icon = ICONS[event.kind ?? "focus"];
    const isCancelled = cancelled(event);
    // `kind` narrows `data`: a meeting and a call have attendees, a focus block none
    const people =
        event.kind === "meeting" || event.kind === "call"
            ? (event.data?.attendees ?? [])
            : [];
    return (
        <Calendar.TimeEvent
            segment={segment}
            aria-label={`${event.title}${isCancelled ? " (cancelled)" : ""}`}
            data-kind={event.kind}
            className={(state) =>
                styles.event({ ...state, cancelled: isCancelled })
            }
        >
            <span className={styles.eventBox}>
                <span className={styles.eventHead}>
                    {isCancelled ? (
                        <Ban aria-hidden className={styles.kindIcon} />
                    ) : (
                        <Icon aria-hidden className={styles.kindIcon} />
                    )}
                    <span data-title className={styles.eventTitle}>
                        {event.title}
                    </span>
                </span>
                <span className={styles.eventTime}>
                    {timesOf(model, segment.occurrenceId)}
                </span>
                {event.kind === "meeting" ? (
                    <span className={styles.eventDetail}>
                        <MapPin aria-hidden className={styles.detailIcon} />
                        {event.data?.room}
                    </span>
                ) : null}
                {event.kind === "call" ? (
                    <span className={styles.eventDetail}>
                        <Video aria-hidden className={styles.detailIcon} />
                        {event.data?.link}
                    </span>
                ) : null}
                {people.length > 0 ? (
                    <span className={styles.attendees}>
                        {people.map((person) => (
                            <span
                                key={person}
                                title={person}
                                className={styles.attendee}
                            >
                                {person.slice(0, 1)}
                            </span>
                        ))}
                    </span>
                ) : null}
            </span>
        </Calendar.TimeEvent>
    );
}

function Toolbar() {
    const title = useCalendarTitle();
    return (
        <div className={styles.toolbar}>
            <h2 className={styles.title}>{text(title)}</h2>
            <Calendar.Today className={styles.button}>Today</Calendar.Today>
            <Calendar.Previous
                aria-label="Previous week"
                className={styles.iconButton}
            >
                <ChevronLeft aria-hidden className={styles.flip} />
            </Calendar.Previous>
            <Calendar.Next aria-label="Next week" className={styles.iconButton}>
                <ChevronRight aria-hidden className={styles.flip} />
            </Calendar.Next>
        </div>
    );
}

function DayHeader({ date }: { date: string }) {
    const parts = useDayHeader(date);
    return (
        <Calendar.ColumnHeader date={date} className={styles.header}>
            {text(parts)}
        </Calendar.ColumnHeader>
    );
}

function SlotTime({ time }: { time: string }) {
    const { model } = useCalendar<Types>();
    const parts = model.get("slot-label-by", {
        time,
        format: { hour: "numeric" },
    });
    return <span className={styles.slotTime}>{text(parts ?? [])}</span>;
}
