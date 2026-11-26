import { computed, Directive, type DoCheck, type Signal } from "@angular/core";
import type { Segment } from "@fragiola/calendar";
import {
    bindPart,
    bindStructuralStyle,
    CALENDAR_DAY,
    calendarValue,
    injectCalendarContext,
    injectHost,
    injectRequired,
    LANE_SIZE,
    type SlotViews,
} from "@fragiola/calendar-angular/internal";
import { bindCollection, injectParent } from "../utils/collection";

export interface DayEventsState {
    /** the segments that start in the day */
    segments: readonly Segment[];
}

/**
 * A day's events (`role="list"`): `<div calendarDayEvents>` with an
 * `<ng-template calendarDayEventsItem let-segment>` per segment that starts in the day, in lane
 * order. It is their containing block (`position: relative`) and holds the row's lanes
 * (`min-block-size`, the row's `lanes` times `--calendar-lane-size`), so every day of a row is as
 * tall. With `dayMaxEvents: "auto"` the engine measures it: it holds no lanes then, give it the
 * day's room (`flex: 1`).
 */
@Directive({ selector: "[calendarDayEvents]", exportAs: "calendarDayEvents" })
export class CalendarDayEventsDirective {
    private readonly context = injectCalendarContext("[calendarDayEvents]");
    private readonly day = injectRequired(
        CALENDAR_DAY,
        "[calendarDayEvents]",
        "[calendarDay]",
    );

    /** @internal the segments that start in the day, in lane order */
    readonly segments: Signal<readonly Segment[]> = computed(() => {
        const column = this.day.column();
        return (this.day.week()?.segments ?? []).filter(
            (segment) => segment.startColumn === column,
        );
    });

    /** what it shows */
    readonly state: Signal<DayEventsState> = computed(() => ({
        segments: this.segments(),
    }));

    constructor() {
        const host = injectHost();
        bindPart(this.context, host, "day-events", () => {
            const day = this.day.day();
            return day ? { date: day.date } : undefined;
        });
        const auto = calendarValue(
            this.context,
            () => this.context.model().state.settings.dayMaxEvents === "auto",
        );
        bindStructuralStyle(host, () =>
            auto()
                ? { position: "relative" }
                : {
                      position: "relative",
                      minBlockSize: `calc(${this.day.week()?.lanes ?? 0} * ${LANE_SIZE})`,
                  },
        );
    }
}

/** The context of the `calendarDayEventsItem` template: the segment (`let-segment`). */
export interface DayEventsItemContext {
    $implicit: Segment;
    segment: Segment;
}

/**
 * Renders one segment of a `[calendarDayEvents]` (React's children function):
 * `<ng-template calendarDayEventsItem let-segment>`, usually a `[calendarSegment]`. A segment's
 * view renders again only when its segment changes.
 */
@Directive({ selector: "ng-template[calendarDayEventsItem]" })
export class CalendarDayEventsItemDirective implements DoCheck {
    static ngTemplateContextGuard(
        _directive: CalendarDayEventsItemDirective,
        _context: unknown,
    ): _context is DayEventsItemContext {
        return true;
    }

    private readonly events = injectParent(
        CalendarDayEventsDirective,
        "calendarDayEventsItem",
        "[calendarDayEvents]",
    );
    private readonly views: SlotViews<DayEventsItemContext> = bindCollection(
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
