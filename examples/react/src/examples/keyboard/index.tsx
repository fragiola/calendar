"use client";

import {
    Calendar,
    createCalendarModel,
    type Segment,
    type TimeSegment,
    useCalendar,
    useCalendarTitle,
    useDayHeader,
} from "@fragiola/calendar-react";
import {
    DragPreview,
    dragAndDrop,
} from "@fragiola/calendar-react/drag-and-drop";
import { resize } from "@fragiola/calendar-react/resize";
import { Selection, selection } from "@fragiola/calendar-react/selection";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { announcementText } from "./announce";
import * as styles from "./styles";

// The whole calendar from the keyboard. Tab enters the grid once (its one tab stop); the arrows
// move over the slots and the all-day row; Enter goes into a slot's events, Up and Down between
// them, Escape back. On an event, Space grabs it: the arrows move it (a day, or a snap step), Shift
// and the arrows resize it, Enter drops it (one command), Escape cancels. Shift and the arrows on
// a slot select a range. The engine announces each step as data; this app words it in a live
// region of its own (`announce.ts`).
export default function Keyboard() {
    const [model] = useState(() =>
        createCalendarModel<Types, typeof FEATURES>(
            {
                version: 1,
                events: teamWeek(),
                calendars: CALENDARS,
                settings: {},
                view: { type: "week", anchorDate: day() },
            },
            { features: FEATURES },
        ),
    );
    const [message, setMessage] = useState("");
    return (
        <Calendar.Root
            model={model}
            className={styles.root}
            onAnnounce={({ announcement }) =>
                setMessage(announcementText(model, announcement))
            }
        >
            <Toolbar />
            <Keys />
            <div
                role="status"
                aria-live="polite"
                data-testid="announcer"
                className={styles.status}
            >
                {message}
            </div>
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
                    <DragPreview className={styles.preview} />
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
                                    <Selection className={styles.selection} />
                                    <DragPreview className={styles.preview} />
                                </Calendar.Column>
                            )}
                        </Calendar.Columns>
                    </div>
                </Calendar.Scroller>
            </Calendar.TimeGrid>
        </Calendar.Root>
    );
}

const FEATURES = [selection(), dragAndDrop(), resize()] as const;

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
function scrollToMorning(element: HTMLElement | null) {
    const eight = element?.querySelector<HTMLElement>('[data-time="08:00"]');
    if (element && eight) element.scrollTop = eight.offsetTop - 8;
}

const KEYS = [
    ["Arrows", "move"],
    ["Enter", "into a slot's events"],
    ["Space", "grab"],
    ["Shift + arrows", "resize, or select"],
    ["Enter", "drop"],
    ["Escape", "cancel"],
] as const;

function Keys() {
    return (
        <ul aria-label="Keys" className={styles.keys}>
            {KEYS.map(([keys, what]) => (
                <li key={`${keys} ${what}`}>
                    <kbd className={styles.key}>{keys}</kbd> {what}
                </li>
            ))}
        </ul>
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
