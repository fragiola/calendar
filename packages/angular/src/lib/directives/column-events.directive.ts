import { computed, Directive, type DoCheck, type Signal } from "@angular/core";
import type { TimeSegment } from "@fragiola/calendar";
import {
    bindPart,
    bindStructuralStyle,
    CALENDAR_COLUMN,
    injectCalendarContext,
    injectHost,
    injectRequired,
    type SlotViews,
} from "@fragiola/calendar-angular/internal";
import { bindCollection, injectParent } from "../utils/collection";

export interface ColumnEventsState {
    /** the column's timed segments */
    segments: readonly TimeSegment[];
}

/**
 * A day's timed events (`role="list"`), positioned in its `[calendarColumn]`:
 * `<div calendarColumnEvents>` with an `<ng-template calendarColumnEventsItem let-segment>`. Enter
 * on a slot moves focus to the events that start in it, Up and Down move between them.
 */
@Directive({
    selector: "[calendarColumnEvents]",
    exportAs: "calendarColumnEvents",
})
export class CalendarColumnEventsDirective {
    private readonly context = injectCalendarContext("[calendarColumnEvents]");
    private readonly column = injectRequired(
        CALENDAR_COLUMN,
        "[calendarColumnEvents]",
        "[calendarColumn]",
    );

    /** @internal the column's timed segments */
    readonly segments: Signal<readonly TimeSegment[]> = computed(
        () => this.column.column()?.segments ?? [],
    );

    /** what it shows */
    readonly state: Signal<ColumnEventsState> = computed(() => ({
        segments: this.segments(),
    }));

    constructor() {
        const host = injectHost();
        bindPart(this.context, host, "column-events", () => {
            const column = this.column.column();
            return column ? { date: column.date } : undefined;
        });
        // the column's containing block, for its events' percentages
        bindStructuralStyle(host, () => ({ position: "absolute", inset: 0 }));
    }
}

/** The context of the `calendarColumnEventsItem` template: the segment (`let-segment`). */
export interface ColumnEventsItemContext {
    $implicit: TimeSegment;
    segment: TimeSegment;
}

/**
 * Renders one timed segment of a `[calendarColumnEvents]` (React's children function):
 * `<ng-template calendarColumnEventsItem let-segment>`, usually a `[calendarTimeEvent]`.
 */
@Directive({ selector: "ng-template[calendarColumnEventsItem]" })
export class CalendarColumnEventsItemDirective implements DoCheck {
    static ngTemplateContextGuard(
        _directive: CalendarColumnEventsItemDirective,
        _context: unknown,
    ): _context is ColumnEventsItemContext {
        return true;
    }

    private readonly events = injectParent(
        CalendarColumnEventsDirective,
        "calendarColumnEventsItem",
        "[calendarColumnEvents]",
    );
    private readonly views: SlotViews<ColumnEventsItemContext> = bindCollection(
        () =>
            this.events.segments().map((segment) => ({
                key: segment.occurrenceId,
                context: { $implicit: segment, segment },
            })),
    );

    /** its views are checked whenever the template it is in is (as embedded views are) */
    ngDoCheck(): void {
        this.views.markForCheck();
    }
}
