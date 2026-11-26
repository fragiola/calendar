import { computed, Directive, inject, input, type Signal } from "@angular/core";
import type { Segment } from "@fragiola/calendar";
import {
    beforeInputs,
    bindPart,
    bindStructuralStyle,
    CALENDAR_EVENT,
    CALENDAR_WEEK,
    type EventContext,
    type EventState,
    eventStateOf,
    injectCalendarContext,
    injectHost,
    injectRequired,
    segmentStyle,
} from "@fragiola/calendar-angular/internal";

/** What a day-grid segment shows (`[calendarSegment]`, `injectSegment`). */
export interface SegmentState extends EventState {
    /** the segment as the layout gives it: `startColumn`, `span`, `lane` in its row */
    segment: Segment;
}

/**
 * An occurrence's part in a day-grid row (`role="listitem"`, `data-event-id`, …):
 * `<div [calendarSegment]="segment">`, focusable, draggable with `dragAndDrop()`. It places itself
 * from the layout (structural style): in its lane (`--calendar-lane-size` high, default `1.5rem`)
 * and over its `span` days (each day's event area, plus `--calendar-day-gap` between two), on
 * logical properties. Its content is yours (the title is model data).
 */
@Directive({
    selector: "[calendarSegment]",
    exportAs: "calendarSegment",
    providers: [
        {
            provide: CALENDAR_EVENT,
            useFactory: () => inject(CalendarSegmentDirective).eventContext,
        },
    ],
})
export class CalendarSegmentDirective {
    /** the segment, from `<ng-template calendarDayEventsItem let-segment>` */
    readonly calendarSegment = input.required<Segment>();

    private readonly context = injectCalendarContext("[calendarSegment]");
    private readonly row = injectRequired(
        CALENDAR_WEEK,
        "[calendarSegment]",
        "[calendarWeek] or [calendarAllDayRow]",
    );
    private readonly segment = computed(() =>
        beforeInputs(undefined, this.calendarSegment),
    );
    /** the day of the cell it starts in */
    private readonly date = computed(() => {
        const segment = this.segment();
        const week = this.row.week();
        if (!segment || !week) return undefined;
        return week.days[segment.startColumn]?.date ?? week.id;
    });

    /** @internal what the parts inside read (a resize handle) */
    readonly eventContext: EventContext = {
        occurrenceId: computed(() => this.segment()?.occurrenceId),
        date: this.date,
        timeSegment: computed(() => undefined),
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
    readonly state: Signal<SegmentState | undefined> = computed(() => {
        const segment = this.segment();
        return segment
            ? { ...eventStateOf(this.attributes()), segment }
            : undefined;
    });

    constructor() {
        bindStructuralStyle(this.host, () => {
            const segment = this.segment();
            return segment ? segmentStyle(segment) : undefined;
        });
    }
}
