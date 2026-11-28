import {
    Calendar,
    type DayCell,
    type Segment,
    type TimeGridColumn,
    type TimeSegment,
    type TimeSlot,
    useCalendar,
    useCalendarView,
    useDayHeader,
} from "@fragiola/calendar-react";
import { BusinessHours } from "@fragiola/calendar-react/constraints";
import { DragPreview } from "@fragiola/calendar-react/drag-and-drop";
import { NowIndicator } from "@fragiola/calendar-react/now-indicator";
import { ResizeHandle } from "@fragiola/calendar-react/resize";
import { Selection } from "@fragiola/calendar-react/selection";
import { Repeat } from "lucide-react";
import type { CSSProperties } from "react";
import type { Types } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import type { features } from "./planner";
import * as styles from "./styles";

// The planner's time grid (a week, or a day): the all-day row, the slots, and over them each
// day's business hours, events, the selection, the drag preview and the now line.
export function PlannerGrid() {
    const view = useCalendarView();
    const days = view.type === "day" ? 1 : 7;
    return (
        <Calendar.TimeGrid
            aria-label={view.type === "day" ? "Day" : "Week"}
            className={styles.grid}
            style={{ "--days": days } as CSSProperties}
        >
            <Calendar.ColumnHeaders className={styles.headers}>
                {dayHeader}
            </Calendar.ColumnHeaders>
            <Calendar.AllDayRow className={styles.allDayRow}>
                <div aria-hidden className={styles.allDayLabel}>
                    all-day
                </div>
                <Calendar.Days>{allDayCell}</Calendar.Days>
                <Selection className={styles.selection} />
                <DragPreview className={styles.preview} />
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
            <BusinessHours className={styles.businessHours} />
            <Calendar.ColumnEvents>{timedEvent}</Calendar.ColumnEvents>
            <Selection className={styles.selection} />
            <DragPreview className={styles.preview} />
            <NowIndicator className={styles.now} />
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

// A timed event: its box, a mark when it repeats, and a handle at its end to resize it.
function TimedEvent({ segment }: { segment: TimeSegment }) {
    const { model } = useCalendar<Types, typeof features>();
    const recurring = model.is("event-recurring", { eventId: segment.eventId });
    return (
        <Calendar.TimeEvent segment={segment} className={styles.event}>
            <span className={styles.eventBox}>
                <span className={styles.eventTitle}>
                    {recurring ? (
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
            <ResizeHandle edge="end" className={styles.resizeHandle} />
        </Calendar.TimeEvent>
    );
}
