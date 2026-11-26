import { computed, Directive, inject, input, type Signal } from "@angular/core";
import type { TimeSegment } from "@fragiola/calendar";
import {
    beforeInputs,
    bindPart,
    bindStructuralStyle,
    CALENDAR_COLUMN,
    CALENDAR_EVENT,
    type EventContext,
    type EventState,
    eventStateOf,
    injectCalendarContext,
    injectHost,
    injectRequired,
    timeSegmentStyle,
} from "@fragiola/calendar-angular/internal";

/** What a timed event shows in a column (`[calendarTimeEvent]`, `injectTimeEvent`). */
export interface TimeEventState extends EventState {
    /** the segment as the layout gives it: fractions of the column, its overlap columns */
    segment: TimeSegment;
}

/**
 * A timed occurrence's part in a column (`role="listitem"`, `data-event-id`, …):
 * `<div [calendarTimeEvent]="segment">`, positioned from its layout fractions as percentages of
 * the column (`top`, `height`, `inset-inline-start`, `width`), focusable, draggable with
 * `dragAndDrop()`, resizable with `resize()`. Its content is yours (the title is model data).
 */
@Directive({
    selector: "[calendarTimeEvent]",
    exportAs: "calendarTimeEvent",
    providers: [
        {
            provide: CALENDAR_EVENT,
            useFactory: () => inject(CalendarTimeEventDirective).eventContext,
        },
    ],
})
export class CalendarTimeEventDirective {
    /** the segment, from `<ng-template calendarColumnEventsItem let-segment>` */
    readonly calendarTimeEvent = input.required<TimeSegment>();

    private readonly context = injectCalendarContext("[calendarTimeEvent]");
    private readonly column = injectRequired(
        CALENDAR_COLUMN,
        "[calendarTimeEvent]",
        "[calendarColumn]",
    );
    private readonly segment = computed(() =>
        beforeInputs(undefined, this.calendarTimeEvent),
    );
    private readonly date = computed(() => this.column.column()?.date);

    /** @internal what the parts inside read (a resize handle) */
    readonly eventContext: EventContext = {
        occurrenceId: computed(() => this.segment()?.occurrenceId),
        date: this.date,
        timeSegment: this.segment,
    };

    private readonly host = injectHost();
    private readonly attributes = bindPart(
        this.context,
        this.host,
        "event",
        () => {
            const segment = this.segment();
            const date = this.date();
            return segment && date !== undefined
                ? {
                      occurrenceId: segment.occurrenceId,
                      date,
                      continuesBefore: segment.continuesBefore,
                      continuesAfter: segment.continuesAfter,
                  }
                : undefined;
        },
    );

    /** what it shows (`undefined` until its segment is set) */
    readonly state: Signal<TimeEventState | undefined> = computed(() => {
        const segment = this.segment();
        return segment
            ? { ...eventStateOf(this.attributes()), segment }
            : undefined;
    });

    constructor() {
        bindStructuralStyle(this.host, () => {
            const segment = this.segment();
            // the column layer lets presses through to its slots: an event takes its own
            return segment
                ? { ...timeSegmentStyle(segment), pointerEvents: "auto" }
                : undefined;
        });
    }
}
