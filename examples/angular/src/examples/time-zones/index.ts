import {
    afterNextRender,
    Component,
    type ElementRef,
    viewChild,
} from "@angular/core";
import {
    CALENDAR,
    type CalendarEventJson,
    createCalendarModel,
} from "@fragiola/calendar-angular";
import { CALENDARS, day, type Types, teamWeek, weekday } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { DayHeader } from "./day-header";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

/** Events written in other zones: their instants, and a home zone of their own. */
const ZONED: CalendarEventJson<Types>[] = [
    {
        id: "tokyo-standup",
        kind: "meeting",
        title: "Tokyo standup",
        start: `${weekday(3)}T09:00:00+09:00`,
        end: `${weekday(3)}T09:30:00+09:00`,
        allDay: false,
        timeZone: "Asia/Tokyo",
        calendarId: "katherine",
    },
    {
        id: "london-board",
        kind: "meeting",
        title: "London board call",
        start: `${weekday(2)}T15:00:00Z`,
        end: `${weekday(2)}T16:00:00Z`,
        allDay: false,
        timeZone: "Europe/London",
        calendarId: "company",
    },
];

/** The weekend daylight saving time ends in New York: summer offset (-04:00), then -05:00. */
const DST_WEEKEND: CalendarEventJson<Types>[] = [
    {
        id: "breakfast-edt",
        kind: "meeting",
        title: "Breakfast (EDT)",
        start: "2026-10-31T09:00:00-04:00",
        end: "2026-10-31T10:00:00-04:00",
        allDay: false,
        calendarId: "grace",
    },
    {
        id: "night-shift",
        kind: "focus",
        title: "Night shift",
        start: "2026-11-01T00:30:00-04:00",
        end: "2026-11-01T03:30:00-05:00",
        allDay: false,
        calendarId: "alan",
    },
    {
        id: "breakfast-est",
        kind: "meeting",
        title: "Breakfast (EST)",
        start: "2026-11-02T09:00:00-05:00",
        end: "2026-11-02T10:00:00-05:00",
        allDay: false,
        calendarId: "grace",
    },
];

// Time zones: the display zone is a setting (`settings.set { timeZone }`), so switching it moves
// every event to its wall clock there; the instants stay. An event may have a home zone of its own
// (`timeZone`, the Tokyo standup), and its times are RFC 3339 instants whatever the zone. "DST
// weekend" shows the four days around the end of daylight saving time in New York (Sunday
// 2026-11-01, 02:00 → 01:00): 09:00 stays on the 09:00 slot on both sides, and an event across the
// change lasts its real four hours.
@Component({
    selector: "example-time-zones",
    imports: [CALENDAR, DayHeader, Toolbar],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model" [class]="styles.root">
            <div timeZonesToolbar [class]="styles.toolbar"></div>
            <div calendarTimeGrid aria-label="Week" [class]="styles.grid">
                <div calendarColumnHeaders [class]="styles.headers">
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date" [timeZonesDayHeader]="date" [class]="styles.header"></div>
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
                                </div>
                            </ng-template>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export default class TimeZones {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = createCalendarModel<Types>({
        version: 1,
        events: [...teamWeek(), ...ZONED, ...DST_WEEKEND],
        calendars: CALENDARS,
        settings: { timeZone: "America/New_York" },
        view: { type: "week", anchorDate: day() },
    });
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
