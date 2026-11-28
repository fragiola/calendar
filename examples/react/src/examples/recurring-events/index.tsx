"use client";

import {
    Calendar,
    createCalendarModel,
    type DayCell,
    type EditScope,
    type Segment,
    type TimeGridColumn,
    type TimeSegment,
    type TimeSlot,
    useCalendar,
    useCalendarTitle,
    useDayHeader,
    veto,
} from "@fragiola/calendar-react";
import {
    DragPreview,
    dragAndDrop,
} from "@fragiola/calendar-react/drag-and-drop";
import { recurrence } from "@fragiola/calendar-react/recurrence";
import { ResizeHandle, resize } from "@fragiola/calendar-react/resize";
import { ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { useEffect, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { Dialog } from "#/components/ui/dialog";
import {
    at,
    CALENDARS,
    day,
    type Types,
    teamWeek,
    weekday,
} from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

const FEATURES = [recurrence(), dragAndDrop(), resize()] as const;

/** A move or a resize of an occurrence of a series, waiting for the user's scope. */
interface Pending {
    command: "event.move" | "event.resize";
    payload: Record<string, unknown>;
    title: string;
}

/** The `meta` of a command the user already scoped: the middleware lets it through. */
const SCOPED = { scoped: true } as const;

const SCOPES: { scope: EditScope; label: string }[] = [
    { scope: "this", label: "This event" },
    { scope: "following", label: "This and following events" },
    { scope: "all", label: "All events" },
];

// Recurring events: a weekday standup and a monthly review, RFC 5545 rules expanded over what the
// view shows. A drop or a resize of one occurrence asks which ones it changes (the package never
// asks: here a middleware holds the command, a dialog asks, and the command runs again with the
// scope chosen: `this` overrides the occurrence, `following` splits the series, `all` changes it).
export default function RecurringEvents() {
    const [model] = useState(() =>
        createCalendarModel<Types, typeof FEATURES>(
            {
                version: 1,
                events: [
                    ...teamWeek(),
                    {
                        id: "standup",
                        kind: "meeting",
                        title: "Standup",
                        start: at(weekday(1, -1), "09:00"),
                        end: at(weekday(1, -1), "09:30"),
                        allDay: false,
                        calendarId: "ada",
                        recurrence: {
                            rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
                        },
                    },
                    {
                        id: "review",
                        kind: "meeting",
                        title: "Monthly review",
                        start: at(weekday(5), "13:00"),
                        end: at(weekday(5), "14:00"),
                        allDay: false,
                        calendarId: "company",
                        recurrence: { rule: "FREQ=MONTHLY;COUNT=12" },
                    },
                ],
                calendars: CALENDARS,
                view: { type: "week", anchorDate: day() },
            },
            { features: FEATURES },
        ),
    );
    return (
        <Calendar.Root model={model} className={styles.root}>
            <Toolbar />
            <WeekGrid />
            <ScopeDialog />
        </Calendar.Root>
    );
}

// The dialog holds the edit waiting for its scope: asking re-renders the dialog, not the calendar.
function ScopeDialog() {
    const { model } = useCalendar<Types, typeof FEATURES>();
    const [pending, setPending] = useState<Pending | null>(null);

    useEffect(
        () =>
            model.use((ctx, next) => {
                if (
                    ctx.dryRun ||
                    ctx.meta?.scoped === true ||
                    (ctx.command !== "event.move" &&
                        ctx.command !== "event.resize")
                ) {
                    return next();
                }
                const { eventId, occurrenceId } = ctx.payload;
                const event = ctx.get("event-by", { id: eventId });
                if (
                    occurrenceId === undefined ||
                    event?.recurrence === undefined
                ) {
                    return next();
                }
                setPending({
                    command: ctx.command,
                    payload: { ...ctx.payload },
                    title: event.title,
                });
                return veto("waiting for the user's scope");
            }),
        [model],
    );

    const choose = (scope: EditScope) => {
        if (!pending) return;
        model.run(pending.command, { ...pending.payload, scope } as never, {
            meta: SCOPED,
        });
        setPending(null);
    };

    return (
        <Dialog.Root
            open={pending !== null}
            onOpenChange={(open) => {
                if (!open) setPending(null);
            }}
        >
            <Dialog.Portal>
                <Dialog.Backdrop className={styles.dialogBackdrop} />
                <Dialog.Content className={styles.dialog}>
                    <Dialog.Header>
                        <Dialog.Title>Edit recurring event</Dialog.Title>
                        <Dialog.Description>
                            {`“${pending?.title ?? ""}” repeats. Change which events?`}
                        </Dialog.Description>
                    </Dialog.Header>
                    <Dialog.Body className={styles.scopes}>
                        {SCOPES.map(({ scope, label }) => (
                            <Clickable.Button
                                key={scope}
                                variant="outline"
                                className={styles.scope}
                                onClick={() => choose(scope)}
                            >
                                {label}
                            </Clickable.Button>
                        ))}
                    </Dialog.Body>
                    <Dialog.Footer>
                        <Dialog.Close
                            render={<Clickable.Button variant="ghost" />}
                        >
                            Cancel
                        </Dialog.Close>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
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
            <DragPreview className={styles.preview} />
        </Calendar.Column>
    );
}

function timedEvent(segment: TimeSegment) {
    return <TimedEvent segment={segment} />;
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
    const { model } = useCalendar<Types, typeof FEATURES>();
    return (
        <Calendar.TimeEvent segment={segment} className={styles.event}>
            <span className={styles.eventBox}>
                <span className={styles.eventTitle}>
                    {model.is("event-recurring", {
                        eventId: segment.eventId,
                    }) ? (
                        <Repeat
                            aria-label="Repeats"
                            className={styles.repeat}
                        />
                    ) : null}
                    {titleOf(model, segment.occurrenceId, segment.eventId)}
                </span>
                <span className={styles.eventTime}>
                    {timesOf(model, segment.occurrenceId)}
                </span>
            </span>
            <ResizeHandle edge="end" className={styles.handleEnd} />
        </Calendar.TimeEvent>
    );
}
