import {
    afterNextRender,
    Component,
    DestroyRef,
    type ElementRef,
    inject,
    signal,
    viewChild,
} from "@angular/core";
import { CALENDAR, createCalendarModel } from "@fragiola/calendar-angular";
import { eventSources } from "@fragiola/calendar-angular/event-sources";
import {
    LucideChevronLeft,
    LucideChevronRight,
    LucideLoaderCircle,
} from "@lucide/angular";
import { CALENDARS, day, type Types } from "../_kit/data";
import { text, timesOf, titleOf } from "../_kit/format";
import { DayHeader } from "./day-header";
import { injectFetchMissing } from "./inject-fetch-missing";
import * as styles from "./styles";
import { Title } from "./title";

const features = [eventSources()] as const;

// The events come from a server (a fake one with latency, _kit/fake-server.ts). The feature keeps
// what was fetched and what is loading, and says which days of the view are missing
// (`get("ranges-to-fetch")`); fetching is the app's: on every change, fetch what is missing,
// mark it loading, then hand the events to `event-sources.receive`. Go to next week: its days load.
@Component({
    selector: "example-event-sources",
    imports: [
        CALENDAR,
        DayHeader,
        LucideChevronLeft,
        LucideChevronRight,
        LucideLoaderCircle,
        Title,
    ],
    host: { class: "contents" },
    template: `
        <div [calendarRoot]="model" [attr.aria-busy]="loading()" [class]="styles.root">
            <div [class]="styles.toolbar">
                <h2 eventSourcesTitle [class]="styles.title"></h2>
                <span role="status" [class]="styles.status">
                    @if (loading()) {
                        <svg lucideLoaderCircle aria-hidden="true" [class]="styles.spinner"></svg>Loading events…
                    } @else {
                        Up to date
                    }
                </span>
                <button calendarToday [class]="styles.button">Today</button>
                <button calendarPrevious aria-label="Previous week" [class]="styles.iconButton">
                    <svg lucideChevronLeft aria-hidden="true" [class]="styles.flip"></svg>
                </button>
                <button calendarNext aria-label="Next week" [class]="styles.iconButton">
                    <svg lucideChevronRight aria-hidden="true" [class]="styles.flip"></svg>
                </button>
            </div>
            <div calendarTimeGrid aria-label="Week" [class]="styles.grid">
                <div calendarColumnHeaders [class]="styles.headers">
                    <ng-template calendarColumnHeadersItem let-date>
                        <div [calendarColumnHeader]="date" [eventSourcesDayHeader]="date" [class]="styles.header"></div>
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
export default class EventSources {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly timesOf = timesOf;
    protected readonly model = createCalendarModel<Types, typeof features>(
        {
            version: 1,
            events: [],
            calendars: CALENDARS,
            settings: { eventSources: [{ id: "team" }] },
            view: { type: "week", anchorDate: day() },
        },
        { features },
    );
    /** whether a range is loading, kept in step with the model */
    protected readonly loading = signal(this.isLoading());
    private readonly scroller =
        viewChild.required<ElementRef<HTMLElement>>("scroller");

    constructor() {
        injectFetchMissing(this.model);
        const stop = this.model.subscribe(() =>
            this.loading.set(this.isLoading()),
        );
        inject(DestroyRef).onDestroy(stop);
        afterNextRender(() => scrollToMorning(this.scroller().nativeElement));
    }

    private isLoading(): boolean {
        return this.model.is("event-source-loading", {});
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
