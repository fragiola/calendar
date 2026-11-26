import { Component } from "@angular/core";
import {
    CALENDAR,
    type CalendarEngineEventOf,
    createCalendarModel,
} from "@fragiola/calendar-angular";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { dayText, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";
import { Weekday } from "./weekday";

// A month: the toolbar runs the view commands, the grid is yours to assemble. Days show as many
// events as fit (`dayMaxEvents: "auto"`, measured by the engine); "+N more" opens that day as an
// agenda (the list of any view's days), and "Month" goes back.
@Component({
    selector: "example-month",
    imports: [CALENDAR, Toolbar, Weekday],
    host: { class: "contents" },
    template: `
        <div
            [calendarRoot]="model"
            #calendar="calendarRoot"
            [class]="styles.root"
            (moreClick)="openDay($event)"
        >
            <div monthToolbar [class]="styles.toolbar"></div>
            <!-- the month's grid, or the day "+N more" opened, as a list -->
            @if (calendar.state().view === "day") {
                <div calendarList [class]="styles.agenda">
                    <ng-template calendarListDays let-day>
                        <section [class]="styles.agendaDay">
                            <h3 [class]="styles.agendaHeading">
                                {{ dayText(day.date, model.state.settings.locale) }}
                            </h3>
                            <div [calendarListDay]="day" [class]="styles.agendaList">
                                <ng-template calendarListDayItem let-item>
                                    <div
                                        [calendarListEvent]="item"
                                        #event="calendarListEvent"
                                        [class]="event.state() && styles.agendaItem(event.state()!)"
                                    >
                                        <span [class]="styles.agendaTime">{{
                                            item.allDay ? "all day" : timesOf(model, item.occurrenceId)
                                        }}</span>
                                        <span>{{ titleOf(model, item.occurrenceId, item.eventId) }}</span>
                                    </div>
                                </ng-template>
                            </div>
                        </section>
                    </ng-template>
                </div>
            } @else {
                <div calendarDayGrid aria-label="Month" [class]="styles.grid">
                    <div calendarColumnHeaders [class]="styles.headers">
                        <ng-template calendarColumnHeadersItem let-date>
                            <div [calendarColumnHeader]="date" [monthWeekday]="date" [class]="styles.header"></div>
                        </ng-template>
                    </div>
                    <ng-template calendarWeeks let-week>
                        <div [calendarWeek]="week" [class]="styles.week">
                            <ng-template calendarDays let-day>
                                <div [calendarDay]="day" [class]="styles.day">
                                    <div [class]="styles.dayHeader">
                                        <span [class]="styles.dayNumber">{{ +day.date.slice(8) }}</span>
                                        <button *calendarMore="let more" [class]="styles.more">+{{ more.hiddenCount }} more</button>
                                    </div>
                                    <div calendarDayEvents [class]="styles.dayEvents">
                                        <ng-template calendarDayEventsItem let-segment>
                                            <!-- an event's part in a week: it places itself (its lane, its days);
                                                 its look follows its state (its calendar's palette) -->
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
                    </ng-template>
                </div>
            }
        </div>
    `,
})
export default class Month {
    protected readonly styles = styles;
    protected readonly dayText = dayText;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = createCalendarModel<Types>({
        version: 1,
        events: teamWeek(),
        calendars: CALENDARS,
        settings: { dayMaxEvents: "auto" },
        view: { type: "month", anchorDate: day() },
    });

    protected openDay({ date }: CalendarEngineEventOf<"more-click">) {
        this.model.run("view.set", { type: "day" });
        this.model.run("view.go-to", { date });
    }
}
