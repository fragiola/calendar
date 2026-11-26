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
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { planMyWeek, type ToolCall } from "./assistant";
import * as styles from "./styles";

/** A step the assistant ran, and what the model answered. */
interface Step {
    call: ToolCall;
    outcome: string;
    ok: boolean;
}

// Every change of the calendar is a command with JSON Schemas: `model.get("commands")` is the
// catalogue an AI agent takes as its tool definitions, and `model.dispatch` runs its untrusted
// calls (validated, refused with a reason, never repaired). The assistant here is scripted
// (assistant.ts) so the example runs without a model.
export default function AiCommands() {
    const [model] = useState(() =>
        createCalendarModel<Types>({
            version: 1,
            events: teamWeek(),
            calendars: CALENDARS,
            view: { type: "week", anchorDate: day() },
        }),
    );
    const tools = model.get("commands");
    const [steps, setSteps] = useState<Step[]>([]);
    const plan = () => {
        const done: Step[] = [];
        for (const call of planMyWeek()) {
            // `meta` says who asked: a middleware may decide on it (never read from the input)
            const result = model.dispatch(call, {
                meta: { source: "assistant" },
            });
            done.push({
                call,
                ok: result.ok,
                outcome: result.ok
                    ? "ok"
                    : `${result.error.code}: ${result.error.message}`,
            });
        }
        setSteps(done);
    };
    return (
        <Calendar.Root model={model} className={styles.root}>
            <div className={styles.layout}>
                <div className={styles.main}>
                    <div className={styles.toolbar}>
                        <Title />
                        <Navigation />
                    </div>
                    <Calendar.TimeGrid
                        aria-label="Week"
                        className={styles.grid}
                    >
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
                                                <AllDayEvent
                                                    segment={segment}
                                                />
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
                                                    <SlotTime
                                                        time={slot.time}
                                                    />
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
                                                    <TimedEvent
                                                        segment={segment}
                                                    />
                                                )}
                                            </Calendar.ColumnEvents>
                                        </Calendar.Column>
                                    )}
                                </Calendar.Columns>
                            </div>
                        </Calendar.Scroller>
                    </Calendar.TimeGrid>
                </div>
                <aside aria-label="Assistant" className={styles.panel}>
                    <button
                        type="button"
                        className={styles.primary}
                        onClick={plan}
                        disabled={steps.length > 0}
                    >
                        <Sparkles aria-hidden className={styles.icon} />
                        Plan my week
                    </button>
                    {steps.length > 0 ? (
                        <ol aria-label="Tool calls" className={styles.steps}>
                            {steps.map((step, index) => (
                                <li
                                    // biome-ignore lint/suspicious/noArrayIndexKey: a transcript never reorders
                                    key={index}
                                    className={styles.step(step.ok)}
                                >
                                    <span className={styles.stepCommand}>
                                        {step.call.command}
                                    </span>
                                    <code className={styles.code}>
                                        {JSON.stringify(step.call.payload)}
                                    </code>
                                    <span
                                        className={styles.outcome}
                                    >{`→ ${step.outcome}`}</span>
                                </li>
                            ))}
                        </ol>
                    ) : null}
                    <h3 className={styles.panelHeading}>
                        {`${tools.length} tools, from model.get("commands")`}
                    </h3>
                    <ul aria-label="Tools" className={styles.tools}>
                        {tools.map((tool) => (
                            <li key={tool.name}>
                                <details className={styles.tool}>
                                    <summary className={styles.toolName}>
                                        {tool.name}
                                    </summary>
                                    <p className={styles.toolDescription}>
                                        {tool.description}
                                    </p>
                                    <pre className={styles.schema}>
                                        {JSON.stringify(
                                            tool.payloadSchema,
                                            null,
                                            2,
                                        )}
                                    </pre>
                                </details>
                            </li>
                        ))}
                    </ul>
                </aside>
            </div>
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
        </Calendar.TimeEvent>
    );
}
