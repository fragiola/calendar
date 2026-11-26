import { Component } from "@angular/core";
import {
    CALENDAR,
    type CalendarEventJson,
    createCalendarModel,
} from "@fragiola/calendar-angular";
import { allDay, at, CALENDARS, day, type Types, weekday } from "../_kit/data";
import { timesOf, titleOf } from "../_kit/format";
import { Bar } from "./bar";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";
import { Weekday } from "./weekday";

// Events that are longer than a day. All-day ends are exclusive (a one-day event ends the next
// day); a timed event crossing midnight shows on both days. A segment is an event's part in one
// row: `continuesBefore` and `continuesAfter` say when it goes on in another row, and the
// segments draw it (square ends, an arrow).
const EVENTS: CalendarEventJson<Types>[] = [
    allDay("holiday", "Public holiday", weekday(4), 1, "company"),
    allDay("sprint", "Design sprint", weekday(3), 5, "grace"),
    allDay(
        "vacation",
        "Katherine on vacation",
        weekday(4, -1),
        10,
        "katherine",
    ),
    allDay("conference", "Conference in Lisbon", weekday(1, 1), 3, "alan"),
    {
        id: "release",
        kind: "meeting",
        title: "Release night",
        start: at(weekday(2), "22:00"),
        end: at(weekday(3), "02:00"),
        allDay: false,
        calendarId: "ada",
    },
    {
        id: "flight",
        kind: "trip",
        title: "Flight to Lisbon",
        start: at(weekday(0, 1), "20:00"),
        end: at(weekday(1, 1), "06:30"),
        allDay: false,
        calendarId: "alan",
    },
];

@Component({
    selector: "example-all-day-and-multi-day",
    imports: [Bar, CALENDAR, Toolbar, Weekday],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model" #calendar="calendarRoot" [class]="styles.root">
            <div allDayAndMultiDayToolbar [class]="styles.toolbar"></div>
            @if (calendar.state().view === "month") {
                <div calendarDayGrid aria-label="Month" [class]="styles.grid">
                    <div calendarColumnHeaders [class]="styles.monthHeaders">
                        <ng-template calendarColumnHeadersItem let-date>
                            <div
                                [calendarColumnHeader]="date"
                                [allDayAndMultiDayWeekday]="date"
                                [format]="{ weekday: 'short' }"
                                [class]="styles.header"
                            ></div>
                        </ng-template>
                    </div>
                    <ng-template calendarWeeks let-week>
                        <div [calendarWeek]="week" [class]="styles.week">
                            <ng-template calendarDays let-day>
                                <div [calendarDay]="day" [class]="styles.day">
                                    <span [class]="styles.dayNumber">{{ +day.date.slice(8) }}</span>
                                    <div calendarDayEvents [class]="styles.dayEvents">
                                        <ng-template calendarDayEventsItem let-segment>
                                            <div
                                                [calendarSegment]="segment"
                                                #event="calendarSegment"
                                                allDayAndMultiDayBar
                                                [class]="event.state() && styles.segment(event.state()!)"
                                            ></div>
                                        </ng-template>
                                    </div>
                                </div>
                            </ng-template>
                        </div>
                    </ng-template>
                </div>
            } @else {
                <div calendarTimeGrid aria-label="Week" [class]="styles.grid">
                    <div calendarColumnHeaders [class]="styles.weekHeaders">
                        <ng-template calendarColumnHeadersItem let-date>
                            <div [calendarColumnHeader]="date" [allDayAndMultiDayWeekday]="date" [class]="styles.header"></div>
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
                                            allDayAndMultiDayBar
                                            [class]="event.state() && styles.segment(event.state()!)"
                                        ></div>
                                    </ng-template>
                                </div>
                            </div>
                        </ng-template>
                    </div>
                    <div calendarScroller [class]="styles.scroller">
                        <div [class]="styles.body">
                            <ng-template calendarSlotRows let-slot>
                                <div [calendarSlotRow]="slot" [class]="styles.slotRow">
                                    <div calendarSlotLabel [class]="styles.slotLabel">{{
                                        slot.time.endsWith(":00") ? slot.time : null
                                    }}</div>
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
                                                <!-- a timed segment: a night event is split per column; each part
                                                     says it goes on -->
                                                <div
                                                    [calendarTimeEvent]="segment"
                                                    #event="calendarTimeEvent"
                                                    [class]="event.state() && styles.event(event.state()!)"
                                                >
                                                    <span [class]="styles.eventBox">
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
export default class AllDayAndMultiDay {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = createCalendarModel<Types>({
        version: 1,
        events: EVENTS,
        calendars: CALENDARS,
        settings: {},
        view: { type: "month", anchorDate: day() },
    });
}
