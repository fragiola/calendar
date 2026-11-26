import {
    afterNextRender,
    Component,
    type ElementRef,
    viewChild,
} from "@angular/core";
import { CALENDAR, createCalendarModel } from "@fragiola/calendar-angular";
import {
    CalendarNowIndicatorDirective,
    nowIndicator,
} from "@fragiola/calendar-angular/now-indicator";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { DayHeader } from "./day-header";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

const FEATURES = [nowIndicator()] as const;

// The current time in today's column: `nowIndicator()` gives its place from the model's clock, and
// the engine moves it every minute (its own timer, through the root's window). The line, its dot
// and the shade over what is past are yours; past days carry `data-past`.
@Component({
    selector: "example-now-indicator",
    imports: [CALENDAR, CalendarNowIndicatorDirective, DayHeader, Toolbar],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model" [class]="styles.root">
            <div nowIndicatorToolbar [class]="styles.toolbar"></div>
            <div calendarTimeGrid aria-label="Week" [class]="styles.grid">
                <div calendarColumnHeaders [class]="styles.headers">
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date" [nowIndicatorDayHeader]="date" [class]="styles.header"></div>
                    </ng-template>
                </div>
                <div calendarAllDayRow [class]="styles.allDayRow">
                    <div aria-hidden="true" [class]="styles.allDayLabel">all-day</div>
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
                                    <!-- rendered only in today's column, once the engine runs -->
                                    <div *calendarNowIndicator data-testid="now" [class]="styles.now">
                                        <span [class]="styles.nowShade"></span>
                                        <span [class]="styles.nowLine"></span>
                                        <span [class]="styles.nowDot"></span>
                                    </div>
                                </div>
                            </ng-template>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export default class NowIndicator {
    protected readonly styles = styles;
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
    private readonly scroller =
        viewChild.required<ElementRef<HTMLElement>>("scroller");

    constructor() {
        afterNextRender(() => scrollToNow(this.scroller().nativeElement));
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

/** Opens the time grid two hours before now (app code: the scroll position is yours). */
function scrollToNow(element: HTMLElement) {
    const now = new Date();
    const hour = String(Math.max(now.getHours() - 2, 0)).padStart(2, "0");
    const row = element.querySelector<HTMLElement>(`[data-time="${hour}:00"]`);
    if (row) element.scrollTop = row.offsetTop;
}
