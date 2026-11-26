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
    NowIndicator,
    nowIndicator,
} from "@fragiola/calendar-react/now-indicator";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

// The current time in today's column: `nowIndicator()` gives its place from the model's clock, and
// the engine moves it every minute (its own timer, through the root's window). The line, its dot
// and the shade over what is past are yours; past days carry `data-past`.
export default function NowIndicatorExample() {
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
                    ref={scrollToNow}
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
                                    {/* rendered only in today's column, once the engine runs */}
                                    <NowIndicator
                                        data-testid="now"
                                        className={styles.now}
                                    >
                                        <span className={styles.nowShade} />
                                        <span className={styles.nowLine} />
                                        <span className={styles.nowDot} />
                                    </NowIndicator>
                                </Calendar.Column>
                            )}
                        </Calendar.Columns>
                    </div>
                </Calendar.Scroller>
            </Calendar.TimeGrid>
        </Calendar.Root>
    );
}

const FEATURES = [nowIndicator()] as const;

/** Opens the time grid two hours before now (app code: the scroll position is yours). */
function scrollToNow(element: HTMLElement | null) {
    if (!element) return;
    const now = new Date();
    const hour = String(Math.max(now.getHours() - 2, 0)).padStart(2, "0");
    const row = element.querySelector<HTMLElement>(`[data-time="${hour}:00"]`);
    if (row) element.scrollTop = row.offsetTop;
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
