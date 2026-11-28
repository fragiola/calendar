"use client";

import {
    Calendar,
    type CalendarEngineEventOf,
    createCalendarModel,
    type DayCell,
    type DayGridWeek,
    type Segment,
    type TimeGridColumn,
    type TimeSegment,
    type TimeSlot,
    useCalendar,
    useCalendarTitle,
    useCalendarView,
    useDayHeader,
} from "@fragiola/calendar-react";
import {
    DragPreview,
    type DragPreviewState,
    dragAndDrop,
} from "@fragiola/calendar-react/drag-and-drop";
import { ResizeHandle, resize } from "@fragiola/calendar-react/resize";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type Ref, useImperativeHandle, useRef, useState } from "react";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { dateTimeFormat, text, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

const FEATURES = [dragAndDrop(), resize()] as const;

// Drag and resize: move an event to another day or time, between the all-day row and the time
// grid, or from a week to another in the month; pull either edge to resize it. While it moves,
// `DragPreview` shows where it would land (the model is asked first: a refused target shows
// none), and the drop runs one command, which `onEventDrop` reports.
export default function DragAndResize() {
    const [model] = useState(() =>
        createCalendarModel<Types, typeof FEATURES>(
            {
                version: 1,
                events: teamWeek(),
                calendars: CALENDARS,
                view: { type: "week", anchorDate: day() },
            },
            { features: FEATURES },
        ),
    );
    // the status line keeps its own text: a drop re-renders the line, not the calendar
    const status = useRef<StatusLine>(null);
    return (
        <Calendar.Root
            model={model}
            className={styles.root}
            onEventDrop={(event: CalendarEngineEventOf<"drop">) => {
                const title = titleOf(model, event.occurrenceId, event.eventId);
                status.current?.show(
                    `${event.kind === "move" ? "Moved" : "Resized"} “${title}”: ${
                        event.allDay
                            ? "all day"
                            : timesOf(model, event.occurrenceId)
                    }`,
                );
            }}
        >
            <Toolbar />
            <DropStatus ref={status} />
            <View />
        </Calendar.Root>
    );
}

/** What the status line is told. */
interface StatusLine {
    show(text: string): void;
}

/** The last drop in words, for a screen reader: its text is its own state. */
function DropStatus({ ref }: { ref: Ref<StatusLine> }) {
    const [text, setText] = useState("");
    useImperativeHandle(ref, () => ({ show: setText }), []);
    return (
        <p role="status" className={styles.status}>
            {text}
        </p>
    );
}

function View() {
    const { type } = useCalendarView();
    return type === "month" ? <MonthGrid /> : <WeekGrid />;
}

function MonthGrid() {
    return (
        <Calendar.DayGrid aria-label="Month" className={styles.grid}>
            <Calendar.ColumnHeaders className={styles.monthHeaders}>
                {weekday}
            </Calendar.ColumnHeaders>
            <Calendar.Weeks>{monthWeek}</Calendar.Weeks>
        </Calendar.DayGrid>
    );
}

function WeekGrid() {
    return (
        <Calendar.TimeGrid aria-label="Week" className={styles.grid}>
            <Calendar.ColumnHeaders className={styles.headers}>
                {dayHeader}
            </Calendar.ColumnHeaders>
            <Calendar.AllDayRow className={styles.allDayRow}>
                <div aria-hidden className={styles.allDayLabel}>
                    all-day
                </div>
                <Calendar.Days>{allDayCell}</Calendar.Days>
                <DragPreview className={styles.rowPreview} />
            </Calendar.AllDayRow>
            <Calendar.Scroller
                className={styles.scroller}
                ref={scrollToMorning}
            >
                <div className={styles.body}>
                    <Calendar.SlotRows>{slotRow}</Calendar.SlotRows>
                    <Calendar.Columns className={styles.columns}>
                        {dayColumn}
                    </Calendar.Columns>
                </div>
            </Calendar.Scroller>
        </Calendar.TimeGrid>
    );
}

// The children functions read only their arguments, so they live outside the components: stable,
// each is called again only for a row, a day or an event whose layout changed.
function weekday(date: string) {
    return <Weekday date={date} />;
}

function monthWeek(week: DayGridWeek) {
    return (
        <Calendar.Week week={week} className={styles.monthWeek}>
            <Calendar.Days>{monthDay}</Calendar.Days>
            <DragPreview className={styles.rowPreview} />
        </Calendar.Week>
    );
}

function monthDay(day: DayCell) {
    return (
        <Calendar.Day day={day} className={styles.monthDay}>
            <span className={styles.dayNumber}>
                {Number(day.date.slice(8))}
            </span>
            <Calendar.DayEvents className={styles.dayEvents}>
                {allDayEvent}
            </Calendar.DayEvents>
        </Calendar.Day>
    );
}

function dayHeader(date: string) {
    return <DayHeader date={date} />;
}

function allDayCell(day: DayCell) {
    return (
        <Calendar.Day day={day} className={styles.allDayCell}>
            <Calendar.DayEvents>{allDayEvent}</Calendar.DayEvents>
        </Calendar.Day>
    );
}

function allDayEvent(segment: Segment) {
    return <AllDayEvent segment={segment} />;
}

function slotRow(slot: TimeSlot) {
    return (
        <Calendar.SlotRow slot={slot} className={styles.slotRow}>
            <Calendar.SlotLabel className={styles.slotLabel}>
                {slot.time.endsWith(":00") ? (
                    <SlotTime time={slot.time} />
                ) : null}
            </Calendar.SlotLabel>
            <Calendar.Slots>{slotCell}</Calendar.Slots>
        </Calendar.SlotRow>
    );
}

function slotCell(column: TimeGridColumn) {
    return <Calendar.Slot date={column.date} className={styles.slot} />;
}

function dayColumn(column: TimeGridColumn) {
    return (
        <Calendar.Column column={column} className={styles.column}>
            <Calendar.ColumnEvents>{timedEvent}</Calendar.ColumnEvents>
            {/* where the dragged or resized event would land */}
            <DragPreview className={styles.preview}>{previewTimes}</DragPreview>
        </Calendar.Column>
    );
}

function timedEvent(segment: TimeSegment) {
    return <TimedEvent segment={segment} />;
}

function previewTimes({ preview }: DragPreviewState) {
    return <PreviewTimes start={preview.start} />;
}

/** The preview's start as a wall-clock time (the app's formatting). */
function PreviewTimes({ start }: { start: string }) {
    const time = dateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
    }).format(Date.parse(start));
    return <span className={styles.previewTime}>{time}</span>;
}

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
function scrollToMorning(element: HTMLElement | null) {
    const eight = element?.querySelector<HTMLElement>('[data-time="08:00"]');
    if (element && eight) element.scrollTop = eight.offsetTop - 8;
}

function Toolbar() {
    const title = useCalendarTitle();
    return (
        <div className={styles.toolbar}>
            <h2 className={styles.title}>{text(title)}</h2>
            <Calendar.ViewButton view="week" className={styles.button}>
                Week
            </Calendar.ViewButton>
            <Calendar.ViewButton view="month" className={styles.button}>
                Month
            </Calendar.ViewButton>
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

// A day-grid event: resized from its end day (an all-day event's last day).
function AllDayEvent({ segment }: { segment: Segment }) {
    const { model } = useCalendar<Types>();
    return (
        <Calendar.Segment segment={segment} className={styles.segment}>
            <span className={styles.segmentLabel}>
                {titleOf(model, segment.occurrenceId, segment.eventId)}
            </span>
            {segment.continuesAfter ? null : (
                <ResizeHandle edge="end" className={styles.segmentHandle} />
            )}
        </Calendar.Segment>
    );
}

// A timed event: a handle on each edge, placed by you (the package sets no geometry for them).
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
            <ResizeHandle edge="start" className={styles.handleStart} />
            <ResizeHandle edge="end" className={styles.handleEnd} />
        </Calendar.TimeEvent>
    );
}
