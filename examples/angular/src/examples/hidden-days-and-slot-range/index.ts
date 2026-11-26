import { Component } from "@angular/core";
import { CALENDAR, createCalendarModel } from "@fragiola/calendar-angular";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { DayHeader } from "./day-header";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

// A working week: weekends hidden (`hiddenDays`), the grid from 07:00 to 20:00 (`slotMinTime`,
// `slotMaxTime`), in 15-minute slots (`slotDuration`). The layout, the keys and the navigation
// skip what is hidden; the parts are the same as a full week's.
@Component({
    selector: "example-hidden-days-and-slot-range",
    imports: [CALENDAR, DayHeader, Toolbar],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model" [class]="styles.root">
            <div hiddenDaysAndSlotRangeToolbar [class]="styles.toolbar"></div>
            <div calendarTimeGrid aria-label="Working week" [class]="styles.grid">
                <div calendarColumnHeaders [class]="styles.headers">
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date" [hiddenDaysAndSlotRangeDayHeader]="date" [class]="styles.header"></div>
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
                <div calendarScroller [class]="styles.scroller">
                    <div [class]="styles.body">
                        <ng-template calendarSlotRows let-slot>
                            <!-- a row's look follows its slot (the hour's line): its state -->
                            <div
                                [calendarSlotRow]="slot"
                                #row="calendarSlotRow"
                                [class]="row.state() && styles.slotRow(row.state()!)"
                            >
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
                                </div>
                            </ng-template>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export default class HiddenDaysAndSlotRange {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = createCalendarModel<Types>({
        version: 1,
        events: teamWeek(),
        calendars: CALENDARS,
        settings: {
            hiddenDays: [0, 6],
            slotMinTime: "07:00",
            slotMaxTime: "20:00",
            slotDuration: 15,
            firstDayOfWeek: 1,
        },
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
