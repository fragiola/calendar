"use client";

import {
    Calendar,
    type CalendarEventJson,
    createCalendarModel,
    type Segment,
    type TimeSegment,
    useCalendar,
    useCalendarTitle,
    useDayHeader,
} from "@fragiola/calendar-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { SegmentedControl } from "#/components/ui/segmented-control";
import { CALENDARS, day, type Types, teamWeek, weekday } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

// Time zones: the display zone is a setting (`settings.set { timeZone }`), so switching it moves
// every event to its wall clock there; the instants stay. An event may have a home zone of its own
// (`timeZone`, the Tokyo standup), and its times are RFC 3339 instants whatever the zone. "DST
// weekend" shows the four days around the end of daylight saving time in New York (Sunday
// 2026-11-01, 02:00 → 01:00): 09:00 stays on the 09:00 slot on both sides, and an event across the
// change lasts its real four hours.
export default function TimeZones() {
    const [model] = useState(() =>
        createCalendarModel<Types>({
            version: 1,
            events: [...teamWeek(), ...ZONED, ...DST_WEEKEND],
            calendars: CALENDARS,
            settings: { timeZone: "America/New_York" },
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
                <Calendar.AllDayRow className={styles.allDayRow}>
                    <div aria-hidden className={styles.allDayLabel}>
                        all-day
                    </div>
                    <Calendar.Days>
                        {(day) => (
                            <Calendar.Day
                                day={day}
                                className={styles.allDayCell}
                            >
                                <Calendar.DayEvents>
                                    {(segment) => (
                                        <AllDayEvent segment={segment} />
                                    )}
                                </Calendar.DayEvents>
                            </Calendar.Day>
                        )}
                    </Calendar.Days>
                </Calendar.AllDayRow>
                <Calendar.Scroller
                    className={styles.scroller}
                    ref={scrollToMorning}
                >
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
                                            <TimedEvent segment={segment} />
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

/** The display zones the switcher offers. */
const ZONES = [
    { zone: "America/New_York", label: "New York" },
    { zone: "Europe/London", label: "London" },
    { zone: "Asia/Tokyo", label: "Tokyo" },
] as const;

/** Events written in other zones: their instants, and a home zone of their own. */
const ZONED: CalendarEventJson<Types>[] = [
    {
        id: "tokyo-standup",
        kind: "meeting",
        title: "Tokyo standup",
        start: `${weekday(3)}T09:00:00+09:00`,
        end: `${weekday(3)}T09:30:00+09:00`,
        allDay: false,
        timeZone: "Asia/Tokyo",
        calendarId: "katherine",
    },
    {
        id: "london-board",
        kind: "meeting",
        title: "London board call",
        start: `${weekday(2)}T15:00:00Z`,
        end: `${weekday(2)}T16:00:00Z`,
        allDay: false,
        timeZone: "Europe/London",
        calendarId: "company",
    },
];

/** The weekend daylight saving time ends in New York: summer offset (-04:00), then -05:00. */
const DST_WEEKEND: CalendarEventJson<Types>[] = [
    {
        id: "breakfast-edt",
        kind: "meeting",
        title: "Breakfast (EDT)",
        start: "2026-10-31T09:00:00-04:00",
        end: "2026-10-31T10:00:00-04:00",
        allDay: false,
        calendarId: "grace",
    },
    {
        id: "night-shift",
        kind: "focus",
        title: "Night shift",
        start: "2026-11-01T00:30:00-04:00",
        end: "2026-11-01T03:30:00-05:00",
        allDay: false,
        calendarId: "alan",
    },
    {
        id: "breakfast-est",
        kind: "meeting",
        title: "Breakfast (EST)",
        start: "2026-11-02T09:00:00-05:00",
        end: "2026-11-02T10:00:00-05:00",
        allDay: false,
        calendarId: "grace",
    },
];

function Toolbar() {
    const title = useCalendarTitle();
    const { model } = useCalendar<Types>();
    const [zone, setZone] = useState<string | null>(
        model.state.settings.timeZone,
    );
    const showZone = (next: string | null) => {
        if (!next) return;
        setZone(next);
        model.run("settings.set", { settings: { timeZone: next } });
    };
    const dstWeekend = () => {
        showZone("America/New_York");
        model.run("view.set", { type: "days", days: 4 });
        model.run("view.go-to", { date: "2026-10-31" });
    };
    return (
        <div className={styles.toolbar}>
            <h2 className={styles.title}>{text(title)}</h2>
            <SegmentedControl.Root
                aria-label="Display time zone"
                value={zone}
                onValueChange={showZone}
                className={styles.zones}
            >
                {ZONES.map(({ zone, label }) => (
                    <SegmentedControl.Item key={zone} value={zone}>
                        {label}
                    </SegmentedControl.Item>
                ))}
            </SegmentedControl.Root>
            <button
                type="button"
                className={styles.button}
                onClick={dstWeekend}
            >
                DST weekend
            </button>
            <Calendar.ViewButton view="week" className={styles.button}>
                Week
            </Calendar.ViewButton>
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

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
function scrollToMorning(element: HTMLElement | null) {
    const eight = element?.querySelector<HTMLElement>('[data-time="08:00"]');
    if (element && eight) element.scrollTop = eight.offsetTop - 8;
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

function AllDayEvent({ segment }: { segment: Segment }) {
    const { model } = useCalendar<Types>();
    return (
        <Calendar.Segment segment={segment} className={styles.segment}>
            <span className={styles.segmentLabel}>
                {titleOf(model, segment.occurrenceId, segment.eventId)}
            </span>
        </Calendar.Segment>
    );
}

function TimedEvent({ segment }: { segment: TimeSegment }) {
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
