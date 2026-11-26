import { Component } from "@angular/core";
import { CALENDAR, createCalendarModel } from "@fragiola/calendar-angular";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { titleOf } from "../_kit/format";
import { Settings } from "./settings";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";
import { Weekday } from "./weekday";

// One month in several locales: `settings.set { locale }` changes the first day of the week (the
// locale's, unless `firstDayOfWeek` says otherwise), the weekday names and the title (`Intl` parts)
// and the week numbers (`weekNumbers: "locale"`, or ISO 8601's weeks). The words are the locale's;
// the grid's names (its label, the buttons') are the app's. The rows render a week number before
// their days: `weekNumberColumn` tells the root, so the grid counts that column.
@Component({
    selector: "example-locale-and-week-numbers",
    imports: [CALENDAR, Settings, Toolbar, Weekday],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model" weekNumberColumn [class]="styles.root">
            <div localeAndWeekNumbersToolbar [class]="styles.toolbar"></div>
            <div localeAndWeekNumbersSettings [class]="styles.settings"></div>
            <div calendarDayGrid aria-label="Month" [class]="styles.grid">
                <div calendarColumnHeaders [class]="styles.headers">
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date" [localeAndWeekNumbersWeekday]="date" [class]="styles.header"></div>
                    </ng-template>
                </div>
                <ng-template calendarWeeks let-week>
                    <div [calendarWeek]="week" [class]="styles.week">
                        <div calendarWeekNumber [class]="styles.weekNumber">{{ week.weekNumber }}</div>
                        <ng-template calendarDays let-day>
                            <div [calendarDay]="day" [class]="styles.day">
                                <div [class]="styles.dayHeader">
                                    <span [class]="styles.dayNumber">{{ +day.date.slice(8) }}</span>
                                    <button *calendarMore="let more" [class]="styles.more">+{{ more.hiddenCount }}</button>
                                </div>
                                <div calendarDayEvents [class]="styles.dayEvents">
                                    <ng-template calendarDayEventsItem let-segment>
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
        </div>
    `,
})
export default class LocaleAndWeekNumbers {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly model = createCalendarModel<Types>({
        version: 1,
        events: teamWeek(),
        calendars: CALENDARS,
        settings: {
            locale: "en-US",
            weekNumbers: "locale",
            dayMaxEvents: "auto",
        },
        view: { type: "month", anchorDate: day() },
    });
}
