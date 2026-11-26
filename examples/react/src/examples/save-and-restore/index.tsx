"use client";

import {
    Calendar,
    type CalendarDocument,
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
import { ResizeHandle, resize } from "@fragiola/calendar-react/resize";
import { ChevronLeft, ChevronRight, RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { clearCalendar, restoreCalendar, saveCalendar } from "../_kit/persist";
import * as styles from "./styles";

const features = [dragAndDrop(), resize()] as const;

/** Where this example keeps its calendar in local storage. */
const KEY = "fragiola-calendar-example:save-and-restore";

/** The calendar a first visit (or a reset) starts from. */
function initial(): CalendarDocument<Types> {
    return {
        version: 1,
        events: teamWeek(),
        calendars: CALENDARS,
        view: { type: "week", anchorDate: day() },
    };
}

/** The saved calendar, or the initial one. */
function load() {
    return createCalendarModel<Types, typeof features>(
        restoreCalendar<Types>(KEY) ?? initial(),
        { features },
    );
}

// The calendar is JSON: `model.get("calendar-json", { includeView: true })` is everything it holds
// (events, calendars, settings, and here the view), and `createCalendarModel` reads it back. Move
// an event or change the week, save, then reload the page: the calendar comes back as saved.
export default function SaveAndRestore() {
    const [model, setModel] = useState(load);
    // a reset gives the root a new model: a new key mounts it afresh
    const [generation, setGeneration] = useState(0);
    const [status, setStatus] = useState(() =>
        restoreCalendar(KEY)
            ? "Restored the saved calendar."
            : "Nothing saved yet.",
    );
    const save = () =>
        setStatus(
            saveCalendar(KEY, model)
                ? "Saved. Reload the page to restore it."
                : "This browser does not let the page save.",
        );
    const reset = () => {
        clearCalendar(KEY);
        setModel(() =>
            createCalendarModel<Types, typeof features>(initial(), {
                features,
            }),
        );
        setGeneration((n) => n + 1);
        setStatus("Back to the initial calendar; nothing saved.");
    };
    return (
        <Calendar.Root key={generation} model={model} className={styles.root}>
            <div className={styles.toolbar}>
                <Title />
                <button type="button" className={styles.button} onClick={save}>
                    <Save aria-hidden className={styles.icon} />
                    Save
                </button>
                <button type="button" className={styles.button} onClick={reset}>
                    <RotateCcw aria-hidden className={styles.icon} />
                    Reset
                </button>
                <Navigation />
            </div>
            <p role="status" className={styles.status}>
                {status}
            </p>
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

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
function scrollToMorning(element: HTMLElement | null) {
    const eight = element?.querySelector<HTMLElement>('[data-time="08:00"]');
    if (element && eight) element.scrollTop = eight.offsetTop - 8;
}

function Title() {
    const title = useCalendarTitle();
    return <h2 className={styles.title}>{text(title)}</h2>;
}

function Navigation() {
    return (
        <>
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
        </>
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
            <ResizeHandle edge="end" className={styles.resizeHandle} />
        </Calendar.TimeEvent>
    );
}
