import { Component, signal } from "@angular/core";
import {
    CALENDAR,
    type CalendarEventJson,
    createCalendarModel,
} from "@fragiola/calendar-angular";
import {
    CALENDARS,
    day,
    type Types,
    teamWeek,
    timed,
    weekday,
} from "../_kit/data";
import { titleOf } from "../_kit/format";
import { MorePopover } from "./more-popover";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";
import { Weekday } from "./weekday";

/** A busy month: the team's week, and a standup and a review every weekday of four weeks. */
function busyMonth(): CalendarEventJson<Types>[] {
    const days = [-2, -1, 0, 1].flatMap((weeks) =>
        [1, 2, 3, 4, 5].map((weekdayNumber) => weekday(weekdayNumber, weeks)),
    );
    return [
        ...teamWeek(),
        ...days.flatMap((date) => [
            timed(`standup-${date}`, "Standup", date, "09:00", "09:15", "ada"),
            timed(
                `review-${date}`,
                "Code review",
                date,
                "16:00",
                "16:30",
                "alan",
            ),
        ]),
    ];
}

// A busy month that shows two events a day (`dayMaxEvents: 2`). "+N more" is the More part, the
// trigger of Fragiola UI's popover, which lists the day's events. A press on it, Enter on it (it
// is the last item of the day's events on the keyboard) or an assistive click is the engine's
// `more-click`: the popover opens from `(moreClick)`.
@Component({
    selector: "example-more-events",
    imports: [CALENDAR, MorePopover, Toolbar, Weekday],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model" [class]="styles.root" (moreClick)="open.set($event.date)">
            <div moreEventsToolbar [class]="styles.toolbar"></div>
            <div calendarDayGrid aria-label="Month" [class]="styles.grid">
                <div calendarColumnHeaders [class]="styles.headers">
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date" [moreEventsWeekday]="date" [class]="styles.header"></div>
                    </ng-template>
                </div>
                <ng-template calendarWeeks let-week>
                    <div [calendarWeek]="week" [class]="styles.week">
                        <ng-template calendarDays let-day>
                            <div [calendarDay]="day" [class]="styles.day">
                                <span [class]="styles.dayNumber">{{ +day.date.slice(8) }}</span>
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
                                <!-- the day whose popover is open is app state the days read -->
                                <example-more-popover
                                    [date]="day.date"
                                    [open]="open() === day.date"
                                    (closed)="open.set(null)"
                                />
                            </div>
                        </ng-template>
                    </div>
                </ng-template>
            </div>
        </div>
    `,
})
export default class MoreEvents {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly model = createCalendarModel<Types>({
        version: 1,
        events: busyMonth(),
        calendars: CALENDARS,
        settings: { dayMaxEvents: 2 },
        view: { type: "month", anchorDate: day() },
    });
    /** the day whose popover is open */
    protected readonly open = signal<string | null>(null);
}
