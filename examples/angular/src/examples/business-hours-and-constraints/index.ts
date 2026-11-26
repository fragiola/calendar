import {
    afterNextRender,
    Component,
    type ElementRef,
    viewChild,
} from "@angular/core";
import { CALENDAR, createCalendarModel } from "@fragiola/calendar-angular";
import {
    CalendarBusinessHoursDirective,
    constraints,
} from "@fragiola/calendar-angular/constraints";
import {
    CalendarDragPreviewDirective,
    dragAndDrop,
} from "@fragiola/calendar-angular/drag-and-drop";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { DayHeader } from "./day-header";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

const FEATURES = [constraints(), dragAndDrop()] as const;

// Business hours and constraints, as settings the commands enforce:
// - business hours: weekdays 09:00 to 17:00 (`businessHours`), shaded in the grid;
// - every event stays within them (`eventConstraint: "business-hours"`), all-day ones on days
//   that have some;
// - nothing may overlap the company's events (`overlap: { company: false }`).
// A drag asks the model at each target: a refused one shows no preview, and its drop runs
// nothing. The same rules refuse `event.add` and `event.move` from code.
@Component({
    selector: "example-business-hours-and-constraints",
    imports: [
        CALENDAR,
        CalendarBusinessHoursDirective,
        CalendarDragPreviewDirective,
        DayHeader,
        Toolbar,
    ],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model" [class]="styles.root">
            <div businessHoursAndConstraintsToolbar [class]="styles.toolbar"></div>
            <ul aria-label="Rules" [class]="styles.rules">
                <li>Events stay within business hours, Monday to Friday, 9 to 5.</li>
                <li>Nothing overlaps a company event.</li>
            </ul>
            <div calendarTimeGrid aria-label="Week" [class]="styles.grid">
                <div calendarColumnHeaders [class]="styles.headers">
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date" [businessHoursAndConstraintsDayHeader]="date" [class]="styles.header"></div>
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
                        <!-- the day's business hours, under its events -->
                        <div *calendarBusinessHours [class]="styles.businessHours"></div>
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
                        <!-- shown only where the constraints allow the event -->
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
export default class BusinessHoursAndConstraints {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = createCalendarModel<Types, typeof FEATURES>(
        {
            version: 1,
            events: teamWeek(),
            calendars: CALENDARS,
            settings: {
                businessHours: [
                    {
                        daysOfWeek: [1, 2, 3, 4, 5],
                        startTime: "09:00",
                        endTime: "17:00",
                    },
                ],
                eventConstraint: "business-hours",
                overlap: { company: false },
            },
            view: { type: "week", anchorDate: day() },
        },
        { features: FEATURES },
    );
    private readonly scroller =
        viewChild.required<ElementRef<HTMLElement>>("scroller");

    constructor() {
        afterNextRender(() => scrollToMorning(this.scroller().nativeElement));
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
