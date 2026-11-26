import {
    afterNextRender,
    Component,
    DestroyRef,
    type ElementRef,
    inject,
    signal,
    viewChild,
} from "@angular/core";
import {
    CALENDAR,
    createCalendarModel,
    type EditScope,
    type SelectionRange,
} from "@fragiola/calendar-angular";
import { CalendarBusinessHoursDirective } from "@fragiola/calendar-angular/constraints";
import { CalendarDragPreviewDirective } from "@fragiola/calendar-angular/drag-and-drop";
import { CalendarNowIndicatorDirective } from "@fragiola/calendar-angular/now-indicator";
import { CalendarResizeHandleDirective } from "@fragiola/calendar-angular/resize";
import {
    CalendarSelectionDirective,
    CalendarSelectionRootDirective,
} from "@fragiola/calendar-angular/selection";
import { LucideRepeat } from "@lucide/angular";
import { CALENDARS, day, type Types } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { CalendarToggle } from "./calendar-toggle";
import { DayHeader } from "./day-header";
import { EventEditor, type NewEvent } from "./event-editor";
import { MiniMonth } from "./mini-month";
import {
    askForScope,
    features,
    type PendingEdit,
    plannerEvents,
    runWithScope,
} from "./planner";
import { ScopeDialog } from "./scope-dialog";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

// A team's week, every feature at once: a calendar per person (shown or hidden from the panel), a
// mini month to jump around, events to drag and resize, a range to select that opens an editor, a
// daily standup whose edits ask "this, following or all?", and business hours shaded in the grid.
@Component({
    selector: "example-team-planner",
    imports: [
        CALENDAR,
        CalendarBusinessHoursDirective,
        CalendarDragPreviewDirective,
        CalendarNowIndicatorDirective,
        CalendarResizeHandleDirective,
        CalendarSelectionDirective,
        CalendarSelectionRootDirective,
        CalendarToggle,
        DayHeader,
        EventEditor,
        LucideRepeat,
        MiniMonth,
        ScopeDialog,
        Toolbar,
    ],
    host: { class: "contents" },
    template: `
        <div
            [calendarRoot]="model"
            #calendar="calendarRoot"
            calendarSelection
            [class]="styles.root"
            (rangeSelect)="range.set($event.range)"
        >
            <aside aria-label="Planner" [class]="styles.sidebar">
                <example-team-planner-mini-month />
                <!-- the calendars panel: one checkbox per person, showing or hiding their events
                     with \`calendar.set-visible\` (model state: an AI or a server could do the same) -->
                <section aria-labelledby="planner-calendars" [class]="styles.panelSection">
                    <h3 id="planner-calendars" [class]="styles.panelHeading">Calendars</h3>
                    <ul [class]="styles.calendarList">
                        @for (calendar of CALENDARS; track calendar.id) {
                            <li [teamPlannerCalendarToggle]="calendar.id ?? ''" [title]="calendar.title"></li>
                        }
                    </ul>
                </section>
            </aside>
            <div [class]="styles.main">
                <div teamPlannerToolbar [class]="styles.toolbar"></div>
                <!-- the planner's time grid (a week, or a day): the all-day row, the slots, and over them each
                     day's business hours, events, the selection, the drag preview and the now line -->
                <div
                    calendarTimeGrid
                    [attr.aria-label]="calendar.state().view === 'day' ? 'Day' : 'Week'"
                    [style.--days]="calendar.state().view === 'day' ? 1 : 7"
                    [class]="styles.grid"
                >
                    <div calendarColumnHeaders [class]="styles.headers">
                        <ng-template calendarColumnHeadersItem let-date>
                            <div [calendarColumnHeader]="date" [teamPlannerDayHeader]="date" [class]="styles.header"></div>
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
                    <div *calendarSelection [class]="styles.selection"></div>
                    <div *calendarDragPreview [class]="styles.preview"></div>
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
                            <div *calendarBusinessHours [class]="styles.businessHours"></div>
                                        <div calendarColumnEvents>
                                            <ng-template calendarColumnEventsItem let-segment>
                                                <div
                                                    [calendarTimeEvent]="segment"
                                                    #event="calendarTimeEvent"
                                                    [class]="event.state() && styles.event(event.state()!)"
                                                >
                                                    <span [class]="styles.eventBox">
                                                        <span [class]="styles.eventTitle">@if (repeats(segment.eventId)) {<svg lucideRepeat role="img" title="Repeats" aria-label="Repeats" [class]="styles.repeat"></svg>}{{ titleOf(model, segment.occurrenceId, segment.eventId) }}</span>
                                                        <span [class]="styles.eventTime">{{ timesOf(model, segment.occurrenceId) }}</span>
                                                    </span>
                                                    <div *calendarResizeHandle="'end'" [class]="styles.resizeHandle"></div>
                                                </div>
                                            </ng-template>
                                        </div>
                            <div *calendarSelection [class]="styles.selection"></div>
                            <div *calendarDragPreview [class]="styles.preview"></div>
                            <div *calendarNowIndicator [class]="styles.now"></div>
                                    </div>
                                </ng-template>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <example-team-planner-event-editor
                [range]="range()"
                [when]="when(range())"
                (save)="save($event)"
                (closed)="closeEditor()"
            />
            <example-team-planner-scope-dialog
                [open]="pending() !== null"
                (pick)="pick($event)"
                (cancel)="pending.set(null)"
            />
        </div>
    `,
})
export default class TeamPlanner {
    protected readonly styles = styles;
    protected readonly CALENDARS = CALENDARS;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = createCalendarModel<Types, typeof features>(
        {
            version: 1,
            events: plannerEvents(),
            calendars: CALENDARS,
            settings: {
                businessHours: [
                    {
                        daysOfWeek: [1, 2, 3, 4, 5],
                        startTime: "08:00",
                        endTime: "18:00",
                    },
                ],
            },
            view: { type: "week", anchorDate: day() },
        },
        { features },
    );
    protected readonly range = signal<SelectionRange | null>(null);
    protected readonly pending = signal<PendingEdit | null>(null);
    private readonly scroller =
        viewChild.required<ElementRef<HTMLElement>>("scroller");

    constructor() {
        // an edit of a recurring event waits for its scope (planner.ts)
        inject(DestroyRef).onDestroy(
            this.model.use(askForScope((edit) => this.pending.set(edit))),
        );
        afterNextRender(() => scrollToMorning(this.scroller().nativeElement));
    }

    protected closeEditor() {
        this.range.set(null);
        this.model.run("selection.clear", {});
    }

    protected save({ title, calendarId, range }: NewEvent) {
        this.model.run("event.add", {
            kind: "meeting",
            title,
            calendarId,
            start: range.start,
            end: range.end,
            allDay: range.allDay,
        });
        this.closeEditor();
    }

    protected pick(scope: EditScope) {
        const pending = this.pending();
        if (pending) runWithScope(this.model, pending, scope);
        this.pending.set(null);
    }

    /** A repeat mark on an occurrence of a series. */
    protected repeats(eventId: string): boolean {
        return this.model.is("event-recurring", { eventId });
    }

    /** A selected range in words, for the editor's description. */
    protected when(range: SelectionRange | null): string {
        if (!range) return "";
        if (range.allDay) return `All day from ${range.start}`;
        return new Intl.DateTimeFormat(this.model.state.settings.locale, {
            weekday: "long",
            hour: "numeric",
            minute: "2-digit",
        }).formatRange(Date.parse(range.start), Date.parse(range.end));
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
