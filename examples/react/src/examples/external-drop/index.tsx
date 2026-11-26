"use client";

import {
    Calendar,
    type CalendarEngineEventOf,
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
import { externalDrop } from "@fragiola/calendar-react/external-drop";
import {
    ChevronLeft,
    ChevronRight,
    FileText,
    GripVertical,
} from "lucide-react";
import { useState } from "react";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

/** The app's own drag type: what a task carries (its id), beside a readable text. */
const TASK_TYPE = "application/x-task";

const TASKS = [
    { id: "report", title: "Write the quarterly report", minutes: 90 },
    { id: "invoices", title: "Review invoices", minutes: 30 },
    { id: "onboarding", title: "Onboarding checklist", minutes: 60 },
];

// What a drop becomes (`draft`): a task's title and duration, or a dropped file's name; the
// target gives the times (a slot: timed, the all-day row: all day). `null` leaves a drop to the
// app (the `external-drop` event carries it).
const FEATURES = [
    dragAndDrop(),
    externalDrop({
        accept: (types) => types.includes(TASK_TYPE) || types.includes("Files"),
        draft: (data) => {
            const task = TASKS.find(
                (one) => one.id === data.getData(TASK_TYPE),
            );
            if (task) {
                return {
                    title: task.title,
                    calendarId: "grace",
                    kind: "focus",
                    duration: { minutes: task.minutes },
                };
            }
            const file = data.files[0];
            return file
                ? {
                      title: `Read ${file.name}`,
                      calendarId: "alan",
                      kind: "focus",
                  }
                : null;
        },
    }),
] as const;

// External drop: drag a task from the list onto the week (a native drag: the browser's own), or
// drop a file from your desktop. Each drop runs `event.add` where it lands; the dropped task
// leaves the list.
export default function ExternalDrop() {
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
    const [tasks, setTasks] = useState(TASKS);
    const [dragged, setDragged] = useState<string | null>(null);
    return (
        <Calendar.Root
            model={model}
            className={styles.root}
            onExternalDrop={(event: CalendarEngineEventOf<"external-drop">) => {
                if (event.eventId !== null && dragged !== null) {
                    setTasks((list) =>
                        list.filter((task) => task.id !== dragged),
                    );
                }
                setDragged(null);
            }}
        >
            <Toolbar />
            <div className={styles.layout}>
                <aside className={styles.panel} aria-labelledby="tasks-heading">
                    <h3 id="tasks-heading" className={styles.panelTitle}>
                        Tasks
                    </h3>
                    <ul aria-label="Tasks" className={styles.tasks}>
                        {tasks.map((task) => (
                            <li
                                key={task.id}
                                draggable
                                className={styles.task}
                                onDragStart={(event) => {
                                    event.dataTransfer.setData(
                                        TASK_TYPE,
                                        task.id,
                                    );
                                    event.dataTransfer.setData(
                                        "text/plain",
                                        task.title,
                                    );
                                    event.dataTransfer.effectAllowed = "copy";
                                    setDragged(task.id);
                                }}
                                onDragEnd={() => setDragged(null)}
                            >
                                <GripVertical
                                    aria-hidden
                                    className={styles.grip}
                                />
                                <span>{task.title}</span>
                                <span
                                    className={styles.taskTime}
                                >{`${task.minutes} min`}</span>
                            </li>
                        ))}
                    </ul>
                    {tasks.length === 0 ? (
                        <p className={styles.empty}>Every task is planned.</p>
                    ) : null}
                    <p className={styles.fileHint}>
                        <FileText aria-hidden className={styles.grip} />
                        Or drop a file from your desktop.
                    </p>
                </aside>
                <WeekGrid />
            </div>
        </Calendar.Root>
    );
}

function WeekGrid() {
    return (
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
                        <Calendar.Day day={day} className={styles.allDayCell}>
                            <Calendar.DayEvents>
                                {(segment) => <AllDayEvent segment={segment} />}
                            </Calendar.DayEvents>
                        </Calendar.Day>
                    )}
                </Calendar.Days>
                <DragPreview className={styles.rowPreview} />
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
                                {/* where the dragged task would land */}
                                <DragPreview className={styles.preview} />
                            </Calendar.Column>
                        )}
                    </Calendar.Columns>
                </div>
            </Calendar.Scroller>
        </Calendar.TimeGrid>
    );
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
