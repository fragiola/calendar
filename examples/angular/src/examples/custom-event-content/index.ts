import { Component } from "@angular/core";
import {
    CALENDAR,
    type CalendarEventJson,
    createCalendarModel,
} from "@fragiola/calendar-angular";
import { at, CALENDARS, day, weekday } from "../_kit/data";
import { text } from "../_kit/format";
import { DayHeader } from "./day-header";
import { EventCard } from "./event-card";
import type { Types } from "./kinds";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

const EVENTS: CalendarEventJson<Types>[] = [
    {
        id: "planning",
        kind: "meeting",
        title: "Sprint planning",
        start: at(weekday(1), "10:00"),
        end: at(weekday(1), "11:30"),
        allDay: false,
        calendarId: "ada",
        data: { room: "Atlas", attendees: ["Ada", "Grace", "Alan"] },
    },
    {
        id: "customer",
        kind: "call",
        title: "Customer call",
        start: at(weekday(2), "13:00"),
        end: at(weekday(2), "14:00"),
        allDay: false,
        calendarId: "grace",
        data: {
            link: "meet.example.com/acme",
            attendees: ["Grace", "Katherine"],
        },
    },
    {
        id: "deep-work",
        kind: "focus",
        title: "Focus: billing API",
        start: at(weekday(3), "09:00"),
        end: at(weekday(3), "12:00"),
        allDay: false,
        calendarId: "alan",
    },
    {
        id: "design",
        kind: "meeting",
        title: "Design review",
        start: at(weekday(4), "14:00"),
        end: at(weekday(4), "15:30"),
        allDay: false,
        calendarId: "katherine",
        data: {
            room: "Lisbon",
            attendees: ["Katherine", "Ada"],
            cancelled: true,
        },
    },
    {
        id: "partner",
        kind: "call",
        title: "Partner sync",
        start: at(weekday(5), "10:00"),
        end: at(weekday(5), "11:00"),
        allDay: false,
        calendarId: "company",
        data: { link: "meet.example.com/partner", attendees: ["Alan"] },
    },
];

// Events drawn from their typed data: the event's element is the calendar's (it places itself,
// takes focus, carries its state), and everything inside it is yours.
@Component({
    selector: "example-custom-event-content",
    imports: [CALENDAR, DayHeader, EventCard, Toolbar],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model" [class]="styles.root">
            <div customEventContentToolbar [class]="styles.toolbar"></div>
            <div calendarTimeGrid aria-label="Week" [class]="styles.grid">
                <div calendarColumnHeaders [class]="styles.headers">
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date" [customEventContentDayHeader]="date" [class]="styles.header"></div>
                    </ng-template>
                </div>
                <div calendarScroller [class]="styles.scroller">
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
                                            <div [calendarTimeEvent]="segment" customEventContentCard></div>
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
export default class CustomEventContent {
    protected readonly styles = styles;
    protected readonly model = createCalendarModel<Types>({
        version: 1,
        events: EVENTS,
        calendars: CALENDARS,
        settings: { slotMinTime: "08:00", slotMaxTime: "18:00" },
        view: { type: "week", anchorDate: day() },
    });

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
