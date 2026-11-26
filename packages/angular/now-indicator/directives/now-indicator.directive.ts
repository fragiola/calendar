import {
    computed,
    Directive,
    effect,
    inject,
    TemplateRef,
    ViewContainerRef,
} from "@angular/core";
import type { NowPosition } from "@fragiola/calendar";
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
import { injectNowPosition } from "../inject/inject-now-position";

export interface NowIndicatorState {
    /** where now is: today, the time, its fraction of the column */
    position: NowPosition;
}

/** The context of the `calendarNowIndicator` template: its state (`let-now`). */
export interface NowIndicatorContext {
    $implicit: NowIndicatorState;
}

/**
 * The current time in today's `[calendarColumn]` (`nowIndicator()`):
 * `<div *calendarNowIndicator="let now"></div>`, positioned at its fraction of the column (`top`),
 * moved by the engine's clock; rendered only in today's column and once the engine runs. Hidden
 * from assistive technology.
 */
@Directive({ selector: "ng-template[calendarNowIndicator]" })
export class CalendarNowIndicatorDirective {
    static ngTemplateContextGuard(
        _directive: CalendarNowIndicatorDirective,
        _context: unknown,
    ): _context is NowIndicatorContext {
        return true;
    }

    private readonly context = injectCalendarContext("*calendarNowIndicator");
    private readonly installed = injectFeature(
        this.context,
        "now-indicator",
        "*calendarNowIndicator",
    );
    private readonly column = injectRequired(
        CALENDAR_COLUMN,
        "*calendarNowIndicator",
        "[calendarColumn]",
    );
    private readonly position = injectNowPosition();
    private readonly shown = computed(() => {
        const position = this.position();
        return this.installed() &&
            position &&
            position.date === this.column.column()?.date
            ? position
            : null;
    });

    constructor() {
        const views = new PartViews<NowIndicatorContext>(
            inject(ViewContainerRef),
            inject<TemplateRef<NowIndicatorContext>>(TemplateRef),
            (element, context, injector) => {
                bindPart(this.context, element, "now-indicator", () => ({}), {
                    injector,
                });
                bindStructuralStyle(
                    element,
                    () => ({
                        position: "absolute",
                        top: `${context.$implicit.position.top * 100}%`,
                    }),
                    injector,
                );
            },
        );
        effect(() => {
            const position = this.shown();
            views.sync(
                position
                    ? [{ key: "now", context: { $implicit: { position } } }]
                    : [],
            );
        });
        onDestroy(() => views.clear());
    }
}
