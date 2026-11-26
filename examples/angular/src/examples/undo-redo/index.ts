import {
    afterNextRender,
    Component,
    computed,
    DestroyRef,
    type ElementRef,
    inject,
    signal,
    viewChild,
} from "@angular/core";
import { CALENDAR, createCalendarModel } from "@fragiola/calendar-angular";
import {
    CalendarDragPreviewDirective,
    dragAndDrop,
} from "@fragiola/calendar-angular/drag-and-drop";
import {
    CalendarResizeHandleDirective,
    resize,
} from "@fragiola/calendar-angular/resize";
import {
    LucideChevronLeft,
    LucideChevronRight,
    LucideRedo2,
    LucideUndo2,
} from "@lucide/angular";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { UndoManager } from "../_kit/undo";
import { DayHeader } from "./day-header";
import * as styles from "./styles";
import { Title } from "./title";

const features = [dragAndDrop(), resize()] as const;

// Undo and redo are app code (_kit/undo.ts): the manager listens to every commit of the model and
// keeps the events before each change; undo puts a list back with `event.set-all`. A drag or a
// resize is one command, so one step. Ctrl+Z and Ctrl+Shift+Z (or Ctrl+Y) work anywhere in the
// example.
@Component({
    selector: "example-undo-redo",
    imports: [
        CALENDAR,
        CalendarDragPreviewDirective,
        CalendarResizeHandleDirective,
        DayHeader,
        LucideChevronLeft,
        LucideChevronRight,
        LucideRedo2,
        LucideUndo2,
        Title,
    ],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model" [class]="styles.root">
            <div [class]="styles.toolbar">
                <h2 undoRedoTitle [class]="styles.title"></h2>
                <button type="button" [class]="styles.button" [disabled]="!history().canUndo" (click)="undo.undo()">
                    <svg lucideUndo2 aria-hidden="true" [class]="styles.icon"></svg>Undo
                </button>
                <button type="button" [class]="styles.button" [disabled]="!history().canRedo" (click)="undo.redo()">
                    <svg lucideRedo2 aria-hidden="true" [class]="styles.icon"></svg>Redo
                </button>
                <button calendarToday [class]="styles.button">Today</button>
                <button calendarPrevious aria-label="Previous week" [class]="styles.iconButton">
                    <svg lucideChevronLeft aria-hidden="true" [class]="styles.flip"></svg>
                </button>
                <button calendarNext aria-label="Next week" [class]="styles.iconButton">
                    <svg lucideChevronRight aria-hidden="true" [class]="styles.flip"></svg>
                </button>
            </div>
            <p role="status" [class]="styles.status">{{ statusText() }}</p>
            <div calendarTimeGrid aria-label="Week" [class]="styles.grid">
                <div calendarColumnHeaders [class]="styles.headers">
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date" [undoRedoDayHeader]="date" [class]="styles.header"></div>
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
                                                <div *calendarResizeHandle="'end'" [class]="styles.resizeHandle"></div>
                                            </div>
                                        </ng-template>
                                    </div>
                        <div *calendarDragPreview [class]="styles.preview"></div>
                                </div>
                            </ng-template>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export default class UndoRedo {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = createCalendarModel<Types, typeof features>(
        {
            version: 1,
            events: teamWeek(),
            calendars: CALENDARS,
            view: { type: "week", anchorDate: day() },
        },
        { features },
    );
    protected readonly undo = new UndoManager(this.model);
    /** the manager's snapshot, kept in step with it */
    protected readonly history = signal(this.undo.getSnapshot());
    protected readonly statusText = computed(() => {
        const steps = this.history().undoSteps;
        const last = steps.at(-1)?.command;
        return last
            ? `${steps.length} step${steps.length === 1 ? "" : "s"} to undo, the last one ${last}`
            : "Drag or resize an event, then undo it.";
    });
    private readonly scroller =
        viewChild.required<ElementRef<HTMLElement>>("scroller");

    constructor() {
        const stopHistory = this.undo.subscribe(() =>
            this.history.set(this.undo.getSnapshot()),
        );
        // the shortcuts: on the document, as an editor's are (a field keeps its own)
        const onKey = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey)) return;
            const key = event.key.toLowerCase();
            if (key === "z" && !event.shiftKey) this.undo.undo();
            else if ((key === "z" && event.shiftKey) || key === "y")
                this.undo.redo();
            else return;
            event.preventDefault();
        };
        afterNextRender(() => {
            document.addEventListener("keydown", onKey);
            scrollToMorning(this.scroller().nativeElement);
        });
        inject(DestroyRef).onDestroy(() => {
            document.removeEventListener("keydown", onKey);
            stopHistory();
        });
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
