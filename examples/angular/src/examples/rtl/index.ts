import {
    afterNextRender,
    Component,
    type ElementRef,
    viewChild,
} from "@angular/core";
import { CALENDAR, createCalendarModel } from "@fragiola/calendar-angular";
import {
    CalendarDragAndDropRootDirective,
    CalendarDragPreviewDirective,
    dragAndDrop,
} from "@fragiola/calendar-angular/drag-and-drop";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { DayHeader } from "./day-header";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

const FEATURES = [dragAndDrop()] as const;

// A week in Arabic, right to left: `dir="rtl"` on the root is all it takes. The columns run from
// the right (the engine reads the direction from the root's style), the arrow keys follow the
// reading order, a drag follows the pointer, and every class is a logical property (`ps`, `start`,
// `border-s`), so the same styles serve both directions. The dates are `Intl` parts in `ar`.
@Component({
    selector: "example-rtl",
    imports: [
        CALENDAR,
        CalendarDragAndDropRootDirective,
        CalendarDragPreviewDirective,
        DayHeader,
        Toolbar,
    ],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model" calendarDragAndDrop dir="rtl" lang="ar" [class]="styles.root">
            <div rtlToolbar [class]="styles.toolbar"></div>
            <div calendarTimeGrid aria-label="الأسبوع" [class]="styles.grid">
                <div calendarColumnHeaders [class]="styles.headers">
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date" [rtlDayHeader]="date" [class]="styles.header"></div>
                    </ng-template>
                </div>
                <div calendarAllDayRow [class]="styles.allDayRow">
                    <div aria-hidden="true" [class]="styles.allDayLabel">طوال اليوم</div>
                    <ng-template calendarDays let-day>
                        <div [calendarDay]="day" [class]="styles.allDayCell">
                            <div calendarDayEvents>
                                <ng-template calendarDayEventsItem let-segment>
                                    <!-- a segment's look follows its state (its calendar's palette) -->
                                    <div
                                        [calendarSegment]="segment"
                                        #event="calendarSegment"
                                        [class]="event.state() && styles.segment(event.state()!)"
                                    >
                                        <span [class]="styles.segmentLabel">{{
                                            titleOf(model, segment.occurrenceId, segment.eventId)
                                        }}</span>
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
                                            <!-- a timed event places itself in its column; you draw its box -->
                                            <div
                                                [calendarTimeEvent]="segment"
                                                #event="calendarTimeEvent"
                                                [class]="event.state() && styles.event(event.state()!)"
                                            >
                                                <span [class]="styles.eventBox" data-testid="event-box">
                                                    <span [class]="styles.eventTitle">{{
                                                        titleOf(model, segment.occurrenceId, segment.eventId)
                                                    }}</span>
                                                    <span [class]="styles.eventTime">{{
                                                        timesOf(model, segment.occurrenceId)
                                                    }}</span>
                                                </span>
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
export default class Rtl {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = createCalendarModel<Types, typeof FEATURES>(
        {
            version: 1,
            events: teamWeek(),
            calendars: CALENDARS,
            settings: { locale: "ar", firstDayOfWeek: 6 },
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
