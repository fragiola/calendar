import {
    afterNextRender,
    Component,
    type ElementRef,
    viewChild,
} from "@angular/core";
import {
    CALENDAR,
    type CalendarEngineEventOf,
    createCalendarModel,
} from "@fragiola/calendar-angular";
import {
    CalendarDragAndDropRootDirective,
    CalendarDragPreviewDirective,
    dragAndDrop,
} from "@fragiola/calendar-angular/drag-and-drop";
import {
    CalendarResizeHandleDirective,
    resize,
} from "@fragiola/calendar-angular/resize";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { dateTimeFormat, text, timesOf, titleOf } from "../_kit/format";
import { DayHeader } from "./day-header";
import { DropStatus } from "./drop-status";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";
import { Weekday } from "./weekday";

const FEATURES = [dragAndDrop(), resize()] as const;

// Drag and resize: move an event to another day or time, between the all-day row and the time
// grid, or from a week to another in the month; pull either edge to resize it. While it moves,
// the drag preview shows where it would land (the model is asked first: a refused target shows
// none), and the drop runs one command, which `(eventDrop)` reports.
@Component({
    selector: "example-drag-and-resize",
    imports: [
        CALENDAR,
        CalendarDragAndDropRootDirective,
        CalendarDragPreviewDirective,
        CalendarResizeHandleDirective,
        DayHeader,
        DropStatus,
        Toolbar,
        Weekday,
    ],
    host: { class: "contents" },
    template: `
        <div
            [calendarRoot]="model"
            #calendar="calendarRoot"
            calendarDragAndDrop
            [class]="styles.root"
            (eventDrop)="dropped($event)"
        >
            <div dragAndResizeToolbar [class]="styles.toolbar"></div>
            <example-drag-and-resize-drop-status />
            @if (calendar.state().view === "month") {
                <div calendarDayGrid aria-label="Month" [class]="styles.grid">
                    <div calendarColumnHeaders [class]="styles.monthHeaders">
                        <ng-template calendarColumnHeadersItem let-date>
                            <div [calendarColumnHeader]="date" [dragAndResizeWeekday]="date" [class]="styles.header"></div>
                        </ng-template>
                    </div>
                    <ng-template calendarWeeks let-week>
                        <div [calendarWeek]="week" [class]="styles.monthWeek">
                            <ng-template calendarDays let-day>
                                <div [calendarDay]="day" [class]="styles.monthDay">
                                    <span [class]="styles.dayNumber">{{ +day.date.slice(8) }}</span>
                                    <div calendarDayEvents [class]="styles.dayEvents">
                                        <ng-template calendarDayEventsItem let-segment>
                                            <div
                                                [calendarSegment]="segment"
                                                #event="calendarSegment"
                                                [class]="event.state() && styles.segment(event.state()!)"
                                            >
                                                <span [class]="styles.segmentLabel">{{ titleOf(model, segment.occurrenceId, segment.eventId) }}</span>
                                                <!-- a day-grid event: resized from its end day (an all-day event's last day) -->
                                                @if (!segment.continuesAfter) {
                                                    <div *calendarResizeHandle="'end'" [class]="styles.segmentHandle"></div>
                                                }
                                            </div>
                                        </ng-template>
                                    </div>
                                </div>
                            </ng-template>
                            <div *calendarDragPreview [class]="styles.rowPreview"></div>
                        </div>
                    </ng-template>
                </div>
            } @else {
                <div calendarTimeGrid aria-label="Week" [class]="styles.grid">
                    <div calendarColumnHeaders [class]="styles.headers">
                        <ng-template calendarColumnHeadersItem let-date>
                            <div [calendarColumnHeader]="date" [dragAndResizeDayHeader]="date" [class]="styles.header"></div>
                        </ng-template>
                    </div>
                    <div calendarAllDayRow [class]="styles.allDayRow">
                        <div aria-hidden="true" [class]="styles.allDayLabel">all-day</div>
                        <ng-template calendarDays let-day>
                            <div [calendarDay]="day" [class]="styles.allDayCell">
                                <div calendarDayEvents>
                                    <ng-template calendarDayEventsItem let-segment>
                                        <div
                                            [calendarSegment]="segment"
                                            #event="calendarSegment"
                                            [class]="event.state() && styles.segment(event.state()!)"
                                        >
                                            <span [class]="styles.segmentLabel">{{ titleOf(model, segment.occurrenceId, segment.eventId) }}</span>
                                            <!-- a day-grid event: resized from its end day (an all-day event's last day) -->
                                            @if (!segment.continuesAfter) {
                                                <div *calendarResizeHandle="'end'" [class]="styles.segmentHandle"></div>
                                            }
                                        </div>
                                    </ng-template>
                                </div>
                            </div>
                        </ng-template>
                    <div *calendarDragPreview [class]="styles.rowPreview"></div>
                    </div>
                    <div calendarScroller #scroller [class]="styles.scroller">
                        <div [class]="styles.body">
                            <ng-template calendarSlotRows let-slot>
                                <div [calendarSlotRow]="slot" [class]="styles.slotRow">
                                    <div calendarSlotLabel [class]="styles.slotLabel">
                                        @if (slot.time.endsWith(":00")) {
                                <span [class]="styles.slotTime">{{ hour(slot.time) }}</span>
                            }
                                    </div>
                                    <ng-template calendarSlots let-column>
                                        <div [calendarSlot]="column.date" [class]="styles.slot"></div>
                                    </ng-template>
                                </div>
                            </ng-template>
                            <div calendarColumns [class]="styles.columns">
                                <ng-template calendarColumnsItem let-column>
                                    <div [calendarColumn]="column" [class]="styles.column">
                                        <div calendarColumnEvents>
                                            <ng-template calendarColumnEventsItem let-segment>
                                                <div
                                                    [calendarTimeEvent]="segment"
                                                    #event="calendarTimeEvent"
                                                    [class]="event.state() && styles.event(event.state()!)"
                                                >
                                                    <span [class]="styles.eventBox">
                                                        <span [class]="styles.eventTitle">{{ titleOf(model, segment.occurrenceId, segment.eventId) }}</span>
                                                        <span [class]="styles.eventTime">{{ timesOf(model, segment.occurrenceId) }}</span>
                                                    </span>
                                                    <!-- a handle on each edge, placed by you (the package sets no geometry for them) -->
                                                    <div *calendarResizeHandle="'start'" [class]="styles.handleStart"></div>
                                                    <div *calendarResizeHandle="'end'" [class]="styles.handleEnd"></div>
                                                </div>
                                            </ng-template>
                                        </div>
                            <!-- where the dragged or resized event would land -->
                            <div *calendarDragPreview="let drag" [class]="styles.preview">
                                <span [class]="styles.previewTime">{{ previewTime(drag.preview.start) }}</span>
                            </div>
                                    </div>
                                </ng-template>
                            </div>
                        </div>
                    </div>
                </div>
            }
        </div>
    `,
})
export default class DragAndResize {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = createCalendarModel<Types, typeof FEATURES>(
        {
            version: 1,
            events: teamWeek(),
            calendars: CALENDARS,
            view: { type: "week", anchorDate: day() },
        },
        { features: FEATURES },
    );
    // the status line keeps its own text: a drop re-renders the line, not the calendar
    private readonly status = viewChild.required(DropStatus);
    private readonly scroller = viewChild<ElementRef<HTMLElement>>("scroller");

    constructor() {
        afterNextRender(() => {
            const scroller = this.scroller();
            if (scroller) scrollToMorning(scroller.nativeElement);
        });
    }

    protected dropped(event: CalendarEngineEventOf<"drop">) {
        const title = titleOf(this.model, event.occurrenceId, event.eventId);
        this.status().show(
            `${event.kind === "move" ? "Moved" : "Resized"} “${title}”: ${
                event.allDay
                    ? "all day"
                    : timesOf(this.model, event.occurrenceId)
            }`,
        );
    }

    /** The preview's start as a wall-clock time (the app's formatting). */
    protected previewTime(start: string): string {
        return dateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit",
        }).format(Date.parse(start));
    }

    /** An hour's label, `9 AM` in the calendar's locale. */
    protected hour(time: string): string {
        return text(
            this.model.get("slot-label-by", {
                time,
                format: { hour: "numeric" },
            }) ?? [],
        );
    }
}

/** Opens the time grid at 08:00 (app code: the scroll position is yours). */
function scrollToMorning(element: HTMLElement) {
    const eight = element.querySelector<HTMLElement>('[data-time="08:00"]');
    if (eight) element.scrollTop = eight.offsetTop - 8;
}
