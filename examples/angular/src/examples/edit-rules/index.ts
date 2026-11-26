import {
    afterNextRender,
    Component,
    type ElementRef,
    viewChild,
} from "@angular/core";
import {
    CALENDAR,
    createCalendarModel,
    veto,
} from "@fragiola/calendar-angular";
import {
    CalendarDragPreviewDirective,
    dragAndDrop,
} from "@fragiola/calendar-angular/drag-and-drop";
import { LucideLock } from "@lucide/angular";
import { CALENDARS, day, type Types, teamWeek } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { DayHeader } from "./day-header";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

const FEATURES = [dragAndDrop()] as const;

// Edit rules live in the model, so a drag asks it before showing a preview and a refused drop
// runs nothing:
// - the company's calendar is read-only (`editable: false` on the calendar);
// - the candidate interview may not move (`startEditable: false` on the event);
// - an app rule, in a middleware: nothing moves to a time already past. A middleware runs around
//   every command, a drag's dry runs included, so the preview hides over the past as well.
function createModel() {
    const model = createCalendarModel<Types, typeof FEATURES>(
        {
            version: 1,
            events: teamWeek().map((event) =>
                event.id === "interview"
                    ? { ...event, startEditable: false }
                    : event,
            ),
            calendars: CALENDARS.map((calendar) =>
                calendar.id === "company"
                    ? { ...calendar, editable: false }
                    : calendar,
            ),
            view: { type: "week", anchorDate: day() },
        },
        { features: FEATURES },
    );
    model.use((ctx, next) => {
        if (ctx.command !== "event.move") return next();
        const result = next();
        if (
            result.ok &&
            Date.parse((result.value as { start: string }).start) < Date.now()
        ) {
            return veto("an event cannot move into the past");
        }
        return result;
    });
    return model;
}

@Component({
    selector: "example-edit-rules",
    imports: [
        CALENDAR,
        CalendarDragPreviewDirective,
        DayHeader,
        LucideLock,
        Toolbar,
    ],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model" [class]="styles.root">
            <div editRulesToolbar [class]="styles.toolbar"></div>
            <ul aria-label="Rules" [class]="styles.rules">
                <li>Company events are read-only.</li>
                <li>The interview is locked in place.</li>
                <li>Nothing moves into the past.</li>
            </ul>
            <div calendarTimeGrid aria-label="Week" [class]="styles.grid">
                <div calendarColumnHeaders [class]="styles.headers">
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date" [editRulesDayHeader]="date" [class]="styles.header"></div>
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
                <div *calendarDragPreview [class]="styles.rowPreview"></div>
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
                                                    <span [class]="styles.eventTitle">@if (locked(segment.eventId)) {<svg lucideLock role="img" title="Locked" aria-label="Locked" [class]="styles.lock"></svg>}{{ titleOf(model, segment.occurrenceId, segment.eventId) }}</span>
                                                    <span [class]="styles.eventTime">{{ timesOf(model, segment.occurrenceId) }}</span>
                                                </span>
                                            </div>
                                        </ng-template>
                                    </div>
                        <!-- shown only over a target the model accepts -->
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
export default class EditRules {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = createModel();
    private readonly scroller =
        viewChild.required<ElementRef<HTMLElement>>("scroller");

    constructor() {
        afterNextRender(() => scrollToMorning(this.scroller().nativeElement));
    }

    /**
     * A locked event says so with an icon: its permissions come from the model, which decides them
     * from the event's flags, its calendar's and the settings'.
     */
    protected locked(eventId: string): boolean {
        const permissions = this.model.get("event-permissions-by", { eventId });
        return permissions !== undefined && !permissions.startEditable;
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
