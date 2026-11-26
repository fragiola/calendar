import { Component } from "@angular/core";
import { CALENDAR, createCalendarModel } from "@fragiola/calendar-angular";
import { LucideCalendarX } from "@lucide/angular";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { dayText, timesOf, titleOf } from "../_kit/format";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

// An agenda: the list view shows the month's days that have events, each under a heading you
// write (the day is data), its events as a list. A month without events is `state().empty`: what
// it shows then is yours too.
@Component({
    selector: "example-list",
    imports: [CALENDAR, LucideCalendarX, Toolbar],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model" [class]="styles.root">
            <div listToolbar [class]="styles.toolbar"></div>
            <div calendarList #list="calendarList" [class]="styles.list">
                @if (list.state().empty) {
                    <div [class]="styles.empty">
                        <svg lucideCalendarX aria-hidden="true" [class]="styles.emptyIcon"></svg>
                        <p>Nothing planned this month.</p>
                    </div>
                } @else {
                    <ng-template calendarListDays let-day>
                        <section [class]="styles.day">
                            <h3 [id]="'list-' + day.date" [class]="styles.dayHeading">{{
                                dayText(day.date, model.state.settings.locale)
                            }}</h3>
                            <!-- the day's list is named by its heading -->
                            <div
                                [calendarListDay]="day"
                                [attr.aria-labelledby]="'list-' + day.date"
                                [class]="styles.events"
                            >
                                <ng-template calendarListDayItem let-item>
                                    <!-- an event of the list: a tab stop of its own; its times and title are
                                         the model's data -->
                                    <div
                                        [calendarListEvent]="item"
                                        #event="calendarListEvent"
                                        [class]="event.state() && styles.item(event.state()!)"
                                    >
                                        <span aria-hidden="true" [class]="styles.dot"></span>
                                        <span [class]="styles.time">{{
                                            item.allDay ? "All day" : timesOf(model, item.occurrenceId)
                                        }}</span>
                                        <span [class]="styles.itemTitle">{{
                                            titleOf(model, item.occurrenceId, item.eventId)
                                        }}</span>
                                    </div>
                                </ng-template>
                            </div>
                        </section>
                    </ng-template>
                }
            </div>
        </div>
    `,
})
export default class List {
    protected readonly styles = styles;
    protected readonly dayText = dayText;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = createCalendarModel<Types>({
        version: 1,
        events: teamWeek(),
        calendars: CALENDARS,
        settings: {},
        view: { type: "list", anchorDate: day() },
    });
}
