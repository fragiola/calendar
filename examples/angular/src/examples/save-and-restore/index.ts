import {
    afterNextRender,
    Component,
    type ElementRef,
    Injector,
    inject,
    signal,
    viewChild,
} from "@angular/core";
import {
    CALENDAR,
    type CalendarDocument,
    createCalendarModel,
} from "@fragiola/calendar-angular";
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
    LucideRotateCcw,
    LucideSave,
} from "@lucide/angular";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { clearCalendar, restoreCalendar, saveCalendar } from "../_kit/persist";
import { DayHeader } from "./day-header";
import * as styles from "./styles";
import { Title } from "./title";

const features = [dragAndDrop(), resize()] as const;

/** Where this example keeps its calendar in local storage. */
const KEY = "fragiola-calendar-example:save-and-restore";

/** The calendar a first visit (or a reset) starts from. */
function initial(): CalendarDocument<Types> {
    return {
        version: 1,
        events: teamWeek(),
        calendars: CALENDARS,
        view: { type: "week", anchorDate: day() },
    };
}

/** The saved calendar, or the initial one. */
function load() {
    return createCalendarModel<Types, typeof features>(
        restoreCalendar<Types>(KEY) ?? initial(),
        { features },
    );
}

// The calendar is JSON: `model.get("calendar-json", { includeView: true })` is everything it holds
// (events, calendars, settings, and here the view), and `createCalendarModel` reads it back. Move
// an event or change the week, save, then reload the page: the calendar comes back as saved. A
// reset gives the root a new model, and the root makes a new engine for it.
@Component({
    selector: "example-save-and-restore",
    imports: [
        CALENDAR,
        CalendarDragPreviewDirective,
        CalendarResizeHandleDirective,
        DayHeader,
        LucideChevronLeft,
        LucideChevronRight,
        LucideRotateCcw,
        LucideSave,
        Title,
    ],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model()" [class]="styles.root">
            <div [class]="styles.toolbar">
                <h2 saveAndRestoreTitle [class]="styles.title"></h2>
                <button type="button" [class]="styles.button" (click)="save()">
                    <svg lucideSave aria-hidden="true" [class]="styles.icon"></svg>Save
                </button>
                <button type="button" [class]="styles.button" (click)="reset()">
                    <svg lucideRotateCcw aria-hidden="true" [class]="styles.icon"></svg>Reset
                </button>
                <button calendarToday [class]="styles.button">Today</button>
                <button calendarPrevious aria-label="Previous week" [class]="styles.iconButton">
                    <svg lucideChevronLeft aria-hidden="true" [class]="styles.flip"></svg>
                </button>
                <button calendarNext aria-label="Next week" [class]="styles.iconButton">
                    <svg lucideChevronRight aria-hidden="true" [class]="styles.flip"></svg>
                </button>
            </div>
            <p role="status" [class]="styles.status">{{ status() }}</p>
            <div calendarTimeGrid aria-label="Week" [class]="styles.grid">
                <div calendarColumnHeaders [class]="styles.headers">
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date" [saveAndRestoreDayHeader]="date" [class]="styles.header"></div>
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
                                        <span [class]="styles.segmentLabel">{{ titleOf(model(), segment.occurrenceId, segment.eventId) }}</span>
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
                                                    <span [class]="styles.eventTitle">{{ titleOf(model(), segment.occurrenceId, segment.eventId) }}</span>
                                                    <span [class]="styles.eventTime">{{ timesOf(model(), segment.occurrenceId) }}</span>
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
export default class SaveAndRestore {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = signal(load());
    protected readonly status = signal(
        restoreCalendar(KEY)
            ? "Restored the saved calendar."
            : "Nothing saved yet.",
    );
    private readonly scroller =
        viewChild.required<ElementRef<HTMLElement>>("scroller");
    private readonly injector = inject(Injector);

    constructor() {
        afterNextRender(() => scrollToMorning(this.scroller().nativeElement));
    }

    protected save() {
        this.status.set(
            saveCalendar(KEY, this.model())
                ? "Saved. Reload the page to restore it."
                : "This browser does not let the page save.",
        );
    }

    protected reset() {
        clearCalendar(KEY);
        this.model.set(
            createCalendarModel<Types, typeof features>(initial(), {
                features,
            }),
        );
        this.status.set("Back to the initial calendar; nothing saved.");
        // the new grid opens at 08:00 too
        afterNextRender(() => scrollToMorning(this.scroller().nativeElement), {
            injector: this.injector,
        });
    }

    /** An hour's label, `9 AM` in the calendar's locale. */
    protected hour(time: string): string {
        return text(
            this.model().get("slot-label-by", {
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
