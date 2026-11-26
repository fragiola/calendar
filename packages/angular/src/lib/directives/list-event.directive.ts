import { computed, Directive, inject, input, type Signal } from "@angular/core";
import type { ListItem } from "@fragiola/calendar";
import {
    beforeInputs,
    bindPart,
    CALENDAR_EVENT,
    CALENDAR_LIST_DAY,
    type EventContext,
    type EventState,
    eventStateOf,
    injectCalendarContext,
    injectHost,
    injectRequired,
} from "@fragiola/calendar-angular/internal";

/** What a list view's event shows (`[calendarListEvent]`, `injectListEvent`). */
export interface ListEventState extends EventState {
    /** the item as the list layout gives it */
    item: ListItem;
}

/**
 * An occurrence of a list view's day (`role="listitem"`, `data-event-id`, …):
 * `<div [calendarListEvent]="item">`, a tab stop of its own. Its content is yours.
 */
@Directive({
    selector: "[calendarListEvent]",
    exportAs: "calendarListEvent",
    providers: [
        {
            provide: CALENDAR_EVENT,
            useFactory: () => inject(CalendarListEventDirective).eventContext,
        },
    ],
})
export class CalendarListEventDirective {
    /** the occurrence, from `<ng-template calendarListDayItem let-item>` */
    readonly calendarListEvent = input.required<ListItem>();

    private readonly context = injectCalendarContext("[calendarListEvent]");
    private readonly listDay = injectRequired(
        CALENDAR_LIST_DAY,
        "[calendarListEvent]",
        "[calendarListDay]",
    );
    private readonly item = computed(() =>
        beforeInputs(undefined, this.calendarListEvent),
    );
    private readonly date = computed(() => this.listDay.day()?.date);

    /** @internal what the parts inside read */
    readonly eventContext: EventContext = {
        occurrenceId: computed(() => this.item()?.occurrenceId),
        date: this.date,
        timeSegment: computed(() => undefined),
    };

    private readonly attributes = bindPart(
        this.context,
        injectHost(),
        "event",
        () => {
            const item = this.item();
            const date = this.date();
            return item && date !== undefined
                ? {
                      occurrenceId: item.occurrenceId,
                      date,
                      continuesBefore: item.continuesBefore,
                      continuesAfter: item.continuesAfter,
                  }
                : undefined;
        },
    );

    /** what it shows (`undefined` until its item is set) */
    readonly state: Signal<ListEventState | undefined> = computed(() => {
        const item = this.item();
        return item ? { ...eventStateOf(this.attributes()), item } : undefined;
    });
}
