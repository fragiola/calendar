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
import { resize } from "@fragiola/calendar-angular/resize";
import {
    CalendarSelectionDirective,
    selection,
} from "@fragiola/calendar-angular/selection";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { announcementText } from "./announce";
import { DayHeader } from "./day-header";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

const FEATURES = [selection(), dragAndDrop(), resize()] as const;

const KEYS = [
    ["Arrows", "move"],
    ["Enter", "into a slot's events"],
    ["Space", "grab"],
    ["Shift + arrows", "resize, or select"],
    ["Enter", "drop"],
    ["Escape", "cancel"],
] as const;

// The whole calendar from the keyboard. Tab enters the grid once (its one tab stop); the arrows
// move over the slots and the all-day row; Enter goes into a slot's events, Up and Down between
// them, Escape back. On an event, Space grabs it: the arrows move it (a day, or a snap step), Shift
// and the arrows resize it, Enter drops it (one command), Escape cancels. Shift and the arrows on
// a slot select a range. The engine announces each step as data; this app words it in a live
// region of its own (`announce.ts`).
@Component({
    selector: "example-keyboard",
    imports: [
        CALENDAR,
        CalendarDragPreviewDirective,
        CalendarSelectionDirective,
        DayHeader,
        Toolbar,
    ],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model" [class]="styles.root" (announce)="announce($event)">
            <div keyboardToolbar [class]="styles.toolbar"></div>
            <ul aria-label="Keys" [class]="styles.keys">
                @for (key of KEYS; track $index) {
                    <li><kbd [class]="styles.key">{{ key[0] }}</kbd> {{ key[1] }}</li>
                }
            </ul>
            <div role="status" aria-live="polite" data-testid="announcer" [class]="styles.status">{{ message() }}</div>
            <div calendarTimeGrid aria-label="Week" [class]="styles.grid">
                <div calendarColumnHeaders [class]="styles.headers">
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date" [keyboardDayHeader]="date" [class]="styles.header"></div>
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
                        <div *calendarSelection [class]="styles.selection"></div>
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
export default class Keyboard {
    protected readonly styles = styles;
    protected readonly KEYS = KEYS;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = createCalendarModel<Types, typeof FEATURES>(
        {
            version: 1,
            events: teamWeek(),
            calendars: CALENDARS,
            settings: {},
            view: { type: "week", anchorDate: day() },
        },
        { features: FEATURES },
    );
    protected readonly message = signal("");
    private readonly scroller =
        viewChild.required<ElementRef<HTMLElement>>("scroller");

    constructor() {
        afterNextRender(() => scrollToMorning(this.scroller().nativeElement));
    }

    protected announce({ announcement }: CalendarEngineEventOf<"announce">) {
        this.message.set(announcementText(this.model, announcement));
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
