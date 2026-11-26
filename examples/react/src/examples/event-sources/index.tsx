"use client";

import {
    Calendar,
    type CalendarModel,
    createCalendarModel,
    type Segment,
    type TimeSegment,
    useCalendar,
    useCalendarTitle,
    useDayHeader,
} from "@fragiola/calendar-react";
import { eventSources } from "@fragiola/calendar-react/event-sources";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CALENDARS, day, type Types } from "../_kit/data";
import { fetchEvents } from "../_kit/fake-server";
import { text, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";

const features = [eventSources()] as const;

type Model = CalendarModel<Types, typeof features>;

// The events come from a server (a fake one with latency, _kit/fake-server.ts). The feature keeps
// what was fetched and what is loading, and says which days of the view are missing
// (`get("ranges-to-fetch")`); fetching is the app's: on every change, fetch what is missing,
// mark it loading, then hand the events to `event-sources.receive`. Go to next week: its days load.
export default function EventSources() {
    const [model] = useState(() =>
        createCalendarModel<Types, typeof features>(
            {
                version: 1,
                events: [],
                calendars: CALENDARS,
                settings: { eventSources: [{ id: "team" }] },
                view: { type: "week", anchorDate: day() },
            },
            { features },
        ),
    );
    useFetchMissing(model);
    const loading = useSyncExternalStore(model.subscribe, () =>
        model.is("event-source-loading", {}),
    );
    return (
        <Calendar.Root
            model={model}
            className={styles.root}
            aria-busy={loading}
        >
            <div className={styles.toolbar}>
                <Title />
                <span role="status" className={styles.status}>
                    {loading ? (
                        <>
                            <LoaderCircle
                                aria-hidden
                                className={styles.spinner}
                            />
                            Loading events…
                        </>
                    ) : (
                        "Up to date"
                    )}
                </span>
                <Navigation />
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

/** Fetches the days the view shows and nobody fetched yet, whenever the model changes. */
function useFetchMissing(model: Model) {
    useEffect(() => {
        const controller = new AbortController();
        const fetchMissing = () => {
            for (const { sourceId, range } of model.get(
                "ranges-to-fetch",
                {},
            )) {
                model.run("event-sources.set-loading", {
                    sourceId,
                    range,
                    loading: true,
                });
                fetchEvents(sourceId, range, controller.signal).then(
                    (events) => {
                        model.run("event-sources.receive", {
                            sourceId,
                            range,
                            events,
                        });
                        model.run("event-sources.set-loading", {
                            sourceId,
                            range,
                            loading: false,
                        });
                    },
                    () => {
                        // aborted (the example unmounted) or failed: fetch it again later
                        model.run("event-sources.set-loading", {
                            sourceId,
                            range,
                            loading: false,
                        });
                    },
                );
            }
        };
        fetchMissing();
        const stop = model.subscribe(fetchMissing);
        return () => {
            stop();
            controller.abort();
        };
    }, [model]);
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
        </Calendar.TimeEvent>
    );
}
