import {
    afterNextRender,
    Component,
    type ElementRef,
    signal,
    viewChild,
} from "@angular/core";
import {
    CALENDAR,
    type CalendarEngineEventOf,
    createCalendarModel,
} from "@fragiola/calendar-angular";
import {
    CalendarDragPreviewDirective,
    dragAndDrop,
} from "@fragiola/calendar-angular/drag-and-drop";
import {
    CalendarExternalDropRootDirective,
    externalDrop,
} from "@fragiola/calendar-angular/external-drop";
import { LucideFileText, LucideGripVertical } from "@lucide/angular";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { DayHeader } from "./day-header";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

/** The app's own drag type: what a task carries (its id), beside a readable text. */
const TASK_TYPE = "application/x-task";

const TASKS = [
    { id: "report", title: "Write the quarterly report", minutes: 90 },
    { id: "invoices", title: "Review invoices", minutes: 30 },
    { id: "onboarding", title: "Onboarding checklist", minutes: 60 },
];

type Task = (typeof TASKS)[number];

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
@Component({
    selector: "example-external-drop",
    imports: [
        CALENDAR,
        CalendarDragPreviewDirective,
        CalendarExternalDropRootDirective,
        DayHeader,
        LucideFileText,
        LucideGripVertical,
        Toolbar,
    ],
    host: { class: "contents" },
    template: `
        <div
            [calendarRoot]="model"
            calendarExternalDrop
            [class]="styles.root"
            (externalDrop)="dropped($event)"
        >
            <div externalDropToolbar [class]="styles.toolbar"></div>
            <div [class]="styles.layout">
                <aside aria-labelledby="tasks-heading" [class]="styles.panel">
                    <h3 id="tasks-heading" [class]="styles.panelTitle">Tasks</h3>
                    <ul aria-label="Tasks" [class]="styles.tasks">
                        @for (task of tasks(); track task.id) {
                            <li
                                draggable="true"
                                [class]="styles.task"
                                (dragstart)="dragStart($event, task)"
                                (dragend)="dragged = null"
                            >
                                <svg lucideGripVertical aria-hidden="true" [class]="styles.grip"></svg>
                                <span>{{ task.title }}</span>
                                <span [class]="styles.taskTime">{{ task.minutes }} min</span>
                            </li>
                        }
                    </ul>
                    @if (tasks().length === 0) {
                        <p [class]="styles.empty">Every task is planned.</p>
                    }
                    <p [class]="styles.fileHint">
                        <svg lucideFileText aria-hidden="true" [class]="styles.grip"></svg>Or drop a file from your desktop.
                    </p>
                </aside>
                <div calendarTimeGrid aria-label="Week" [class]="styles.grid">
                    <div calendarColumnHeaders [class]="styles.headers">
                        <ng-template calendarColumnHeadersItem let-date>
                            <div [calendarColumnHeader]="date" [externalDropDayHeader]="date" [class]="styles.header"></div>
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
                                                </div>
                                            </ng-template>
                                        </div>
                            <!-- where the dragged task would land -->
                            <div *calendarDragPreview [class]="styles.preview"></div>
                                    </div>
                                </ng-template>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export default class ExternalDrop {
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
    protected readonly tasks = signal(TASKS);
    /** the task being dragged */
    protected dragged: string | null = null;
    private readonly scroller =
        viewChild.required<ElementRef<HTMLElement>>("scroller");

    constructor() {
        afterNextRender(() => scrollToMorning(this.scroller().nativeElement));
    }

    protected dropped(event: CalendarEngineEventOf<"external-drop">) {
        const id = this.dragged;
        if (event.eventId !== null && id !== null) {
            this.tasks.update((tasks) =>
                tasks.filter((task) => task.id !== id),
            );
        }
        this.dragged = null;
    }

    protected dragStart(event: DragEvent, task: Task) {
        if (!event.dataTransfer) return;
        event.dataTransfer.setData(TASK_TYPE, task.id);
        event.dataTransfer.setData("text/plain", task.title);
        event.dataTransfer.effectAllowed = "copy";
        this.dragged = task.id;
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
