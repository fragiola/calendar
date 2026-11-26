"use client";

import {
    Calendar,
    createCalendarModel,
    type Segment,
    type TimeSegment,
    useCalendar,
    useCalendarTitle,
    useDayHeader,
    veto,
} from "@fragiola/calendar-react";
import {
    DragPreview,
    dragAndDrop,
} from "@fragiola/calendar-react/drag-and-drop";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useState } from "react";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

const FEATURES = [dragAndDrop()] as const;

// Edit rules live in the model, so a drag asks it before showing a preview and a refused drop
// runs nothing:
// - the company's calendar is read-only (`editable: false` on the calendar);
// - the candidate interview may not move (`startEditable: false` on the event);
// - an app rule, in a middleware: nothing moves to a time already past. A middleware runs around
//   every command, a drag's dry runs included, so the preview hides over the past as well.
function createModel() {
    const model = createCalendarModel<Types, typeof FEATURES>(
        {
            version: 1,
            events: teamWeek().map((event) =>
                event.id === "interview"
                    ? { ...event, startEditable: false }
                    : event,
            ),
            calendars: CALENDARS.map((calendar) =>
                calendar.id === "company"
                    ? { ...calendar, editable: false }
                    : calendar,
            ),
            view: { type: "week", anchorDate: day() },
        },
        { features: FEATURES },
    );
    model.use((ctx, next) => {
        if (ctx.command !== "event.move") return next();
        const result = next();
        if (
            result.ok &&
            Date.parse((result.value as { start: string }).start) < Date.now()
        ) {
            return veto("an event cannot move into the past");
        }
        return result;
    });
    return model;
}

export default function EditRules() {
    const [model] = useState(createModel);
    return (
        <Calendar.Root model={model} className={styles.root}>
            <Toolbar />
            <ul aria-label="Rules" className={styles.rules}>
                <li>Company events are read-only.</li>
                <li>The interview is locked in place.</li>
                <li>Nothing moves into the past.</li>
            </ul>
            <WeekGrid />
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
                                {/* shown only over a target the model accepts */}
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

// A locked event says so with an icon: its permissions come from the model, which decides them
// from the event's flags, its calendar's and the settings'.
function TimedEvent({ segment }: { segment: TimeSegment }) {
    const { model } = useCalendar<Types>();
    const permissions = model.get("event-permissions-by", {
        eventId: segment.eventId,
    });
    const locked = permissions !== undefined && !permissions.startEditable;
    return (
        <Calendar.TimeEvent segment={segment} className={styles.event}>
            <span className={styles.eventBox}>
                <span className={styles.eventTitle}>
                    {locked ? (
                        <Lock aria-label="Locked" className={styles.lock} />
                    ) : null}
                    {titleOf(model, segment.occurrenceId, segment.eventId)}
                </span>
                <span className={styles.eventTime}>
                    {timesOf(model, segment.occurrenceId)}
                </span>
            </span>
        </Calendar.TimeEvent>
    );
}
