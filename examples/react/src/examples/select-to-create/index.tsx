"use client";

import {
    Calendar,
    type CalendarEngineEventOf,
    createCalendarModel,
    type Segment,
    type TimeGridColumn,
    type TimeSegment,
    type TimeSlot,
    useCalendar,
    useCalendarTitle,
    useDayHeader,
} from "@fragiola/calendar-react";
import { Selection, selection } from "@fragiola/calendar-react/selection";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { Input } from "#/components/atoms/fields";
import { Dialog } from "#/components/ui/dialog";
import { Field } from "#/components/ui/field";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { dateTimeFormat, text, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

const FEATURES = [selection()] as const;

type Range = CalendarEngineEventOf<"select">["range"];

// Select to create: drag over the slots (or the all-day row), or Shift + arrows then Enter, and
// the selected range opens an editor. Saving runs `event.add` with the range's times; either way
// the selection is cleared. The editor is the app's: the package ships none.
export default function SelectToCreate() {
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
    const [range, setRange] = useState<Range | null>(null);
    const [title, setTitle] = useState("");

    const close = () => {
        setRange(null);
        setTitle("");
        model.run("selection.clear", {});
    };
    const save = () => {
        if (!range) return;
        model.run("event.add", {
            title: title.trim() || "New event",
            start: range.start,
            end: range.end,
            allDay: range.allDay,
            calendarId: "ada",
            kind: "meeting",
        });
        close();
    };

    return (
        <Calendar.Root
            model={model}
            className={styles.root}
            onSelect={(event: CalendarEngineEventOf<"select">) =>
                setRange(event.range)
            }
        >
            <Toolbar />
            <WeekGrid />
            <Dialog.Root
                open={range !== null}
                onOpenChange={(open) => {
                    if (!open) close();
                }}
            >
                <Dialog.Portal>
                    <Dialog.Backdrop />
                    <Dialog.Content>
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                save();
                            }}
                        >
                            <Dialog.Header>
                                <Dialog.Title>New event</Dialog.Title>
                                <Dialog.Description>
                                    {range ? when(range) : ""}
                                </Dialog.Description>
                            </Dialog.Header>
                            <Dialog.Body>
                                <Field.Root>
                                    <Field.Label>Title</Field.Label>
                                    <Field.Row>
                                        <Field.Body>
                                            <Input
                                                value={title}
                                                placeholder="New event"
                                                onChange={(event) =>
                                                    setTitle(event.target.value)
                                                }
                                            />
                                        </Field.Body>
                                    </Field.Row>
                                </Field.Root>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Dialog.Close
                                    render={
                                        <Clickable.Button variant="outline" />
                                    }
                                >
                                    Cancel
                                </Dialog.Close>
                                <Clickable.Button
                                    type="submit"
                                    className={styles.primary}
                                >
                                    Save
                                </Clickable.Button>
                            </Dialog.Footer>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </Calendar.Root>
    );
}

/** The range in words (app formatting: the calendar gives the times as data). */
function when(range: Range): string {
    if (range.allDay) {
        return `All day, from ${range.start} to before ${range.end}`;
    }
    const format = dateTimeFormat("en-US", {
        weekday: "long",
        hour: "numeric",
        minute: "2-digit",
    });
    return format.formatRange(Date.parse(range.start), Date.parse(range.end));
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
                {/* the selected days, over the row */}
                <Selection className={styles.selection} />
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

// The rows' and the columns' children functions read only their arguments, so they live outside
// the component: stable, they are called again only for a row or a column whose layout changed,
// not on every re-render of the app (an announcement, a keystroke in a field).
function slotRow(slot: TimeSlot) {
    return (
        <Calendar.SlotRow slot={slot} className={styles.slotRow}>
            <Calendar.SlotLabel className={styles.slotLabel}>
                {slot.time.endsWith(":00") ? (
                    <SlotTime time={slot.time} />
                ) : null}
            </Calendar.SlotLabel>
            <Calendar.Slots>
                {(column) => (
                    <Calendar.Slot date={column.date} className={styles.slot} />
                )}
            </Calendar.Slots>
        </Calendar.SlotRow>
    );
}

function dayColumn(column: TimeGridColumn) {
    return (
        <Calendar.Column column={column} className={styles.column}>
            <Calendar.ColumnEvents>
                {(segment) => <TimedEvent segment={segment} />}
            </Calendar.ColumnEvents>
            {/* the selected range, laid out as an event */}
            <Selection className={styles.selection} />
        </Calendar.Column>
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
            <p className={styles.hint}>Drag over the grid to create an event</p>
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
