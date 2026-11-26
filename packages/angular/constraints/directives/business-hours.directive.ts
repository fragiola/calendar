import {
    computed,
    Directive,
    effect,
    inject,
    TemplateRef,
    ViewContainerRef,
} from "@angular/core";
import type { BusinessHoursRange } from "@fragiola/calendar";
import {
    bindPart,
    bindStructuralStyle,
    CALENDAR_COLUMN,
    injectCalendarContext,
    injectFeature,
    injectRequired,
    onDestroy,
    PartViews,
} from "@fragiola/calendar-angular/internal";
import { injectBusinessHours } from "../inject/inject-business-hours";

export interface BusinessHoursState {
    /** the range: its day, its instants and its fractions of the column */
    range: BusinessHoursRange;
}

/** The context of the `calendarBusinessHours` template: its state (`let-hours`). */
export interface BusinessHoursContext {
    $implicit: BusinessHoursState;
}

/**
 * A day's business hours in its `[calendarColumn]` (`constraints()`):
 * `<div *calendarBusinessHours="let hours"></div>`, one element per range, positioned at its
 * fractions of the column (`top`, `height`). Hidden from assistive technology; the slots within
 * them carry `data-business-hours`.
 */
@Directive({ selector: "ng-template[calendarBusinessHours]" })
export class CalendarBusinessHoursDirective {
    static ngTemplateContextGuard(
        _directive: CalendarBusinessHoursDirective,
        _context: unknown,
    ): _context is BusinessHoursContext {
        return true;
    }

    private readonly context = injectCalendarContext("*calendarBusinessHours");
    private readonly installed = injectFeature(
        this.context,
        "constraints",
        "*calendarBusinessHours",
    );
    private readonly column = injectRequired(
        CALENDAR_COLUMN,
        "*calendarBusinessHours",
        "[calendarColumn]",
    );
    private readonly ranges = injectBusinessHours(
        computed(() => (this.installed() ? this.column.column()?.date : "")),
    );

    constructor() {
        const views = new PartViews<BusinessHoursContext>(
            inject(ViewContainerRef),
            inject<TemplateRef<BusinessHoursContext>>(TemplateRef),
            (element, context, injector) => {
                bindPart(
                    this.context,
                    element,
                    "business-hours",
                    () => ({ date: context.$implicit.range.date }),
                    { register: false, injector },
                );
                bindStructuralStyle(
                    element,
                    () => {
                        const { range } = context.$implicit;
                        return {
                            position: "absolute",
                            top: `${range.top * 100}%`,
                            height: `${range.height * 100}%`,
                        };
                    },
                    injector,
                );
            },
        );
        effect(() => {
            const ranges = this.installed() ? this.ranges() : [];
            views.sync(
                ranges
                    .filter((range) => range.height > 0)
                    .map((range) => ({
                        key: String(range.start),
                        context: { $implicit: { range } },
                    })),
            );
        });
        onDestroy(() => views.clear());
    }
}
