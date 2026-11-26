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
import { ResizeHandle, resize } from "@fragiola/calendar-react/resize";
import { ChevronLeft, ChevronRight, Redo2, Undo2 } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { UndoManager } from "../_kit/undo";
import * as styles from "./styles";

const features = [dragAndDrop(), resize()] as const;

// Undo and redo are app code (_kit/undo.ts): the manager listens to every commit of the model and
// keeps the events before each change; undo puts a list back with `event.set-all`. A drag or a
// resize is one command, so one step. Ctrl+Z and Ctrl+Shift+Z (or Ctrl+Y) work anywhere in the
// example.
export default function UndoRedo() {
    const [model] = useState(() =>
        createCalendarModel<Types, typeof features>(
            {
                version: 1,
                events: teamWeek(),
                calendars: CALENDARS,
                view: { type: "week", anchorDate: day() },
            },
            { features },
        ),
    );
    const [undo] = useState(() => new UndoManager(model));
    const history = useSyncExternalStore(undo.subscribe, undo.getSnapshot);

    // the shortcuts: on the document, as an editor's are (a field keeps its own)
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey)) return;
            const key = event.key.toLowerCase();
            if (key === "z" && !event.shiftKey) undo.undo();
            else if ((key === "z" && event.shiftKey) || key === "y")
                undo.redo();
            else return;
            event.preventDefault();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [undo]);

    const last = history.undoSteps.at(-1)?.command;
    return (
        <Calendar.Root model={model} className={styles.root}>
            <div className={styles.toolbar}>
                <Title />
                <button
                    type="button"
                    className={styles.button}
                    disabled={!history.canUndo}
                    onClick={() => undo.undo()}
                >
                    <Undo2 aria-hidden className={styles.icon} />
                    Undo
                </button>
                <button
                    type="button"
                    className={styles.button}
                    disabled={!history.canRedo}
                    onClick={() => undo.redo()}
                >
                    <Redo2 aria-hidden className={styles.icon} />
                    Redo
                </button>
                <Navigation />
            </div>
            <p role="status" className={styles.status}>
                {last
                    ? `${history.undoSteps.length} step${history.undoSteps.length === 1 ? "" : "s"} to undo, the last one ${last}`
                    : "Drag or resize an event, then undo it."}
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
