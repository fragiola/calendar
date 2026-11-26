import {
    computed,
    Directive,
    effect,
    inject,
    input,
    TemplateRef,
    ViewContainerRef,
} from "@angular/core";
import {
    beforeInputs,
    bindPart,
    CALENDAR_EVENT,
    injectCalendarContext,
    injectFeature,
    injectRequired,
    onDestroy,
    PartViews,
} from "@fragiola/calendar-angular/internal";

export interface ResizeHandleState {
    /** the edge it moves */
    edge: "start" | "end";
}

/** The context of the `calendarResizeHandle` template: its state (`let-handle`). */
export interface ResizeHandleContext {
    $implicit: ResizeHandleState;
}

/**
 * A handle that resizes its event from one edge (`resize()`), inside a `[calendarSegment]` or a
 * `[calendarTimeEvent]`: `<div *calendarResizeHandle="'end'"></div>` (`data-edge`; place it at the
 * edge yourself). Rendered only with `resize()` installed; hidden from assistive technology: the
 * keyboard resizes a grabbed event with Shift + arrows.
 */
@Directive({ selector: "ng-template[calendarResizeHandle]" })
export class CalendarResizeHandleDirective {
    static ngTemplateContextGuard(
        _directive: CalendarResizeHandleDirective,
        _context: unknown,
    ): _context is ResizeHandleContext {
        return true;
    }

    /** the edge it moves: the event's `start` or its `end` */
    readonly calendarResizeHandle = input.required<"start" | "end">();

    private readonly context = injectCalendarContext("*calendarResizeHandle");
    private readonly installed = injectFeature(
        this.context,
        "resize",
        "*calendarResizeHandle",
    );
    private readonly event = injectRequired(
        CALENDAR_EVENT,
        "*calendarResizeHandle",
        "[calendarSegment] or [calendarTimeEvent]",
    );
    private readonly edge = computed(() =>
        beforeInputs(undefined, this.calendarResizeHandle),
    );

    constructor() {
        const views = new PartViews<ResizeHandleContext>(
            inject(ViewContainerRef),
            inject<TemplateRef<ResizeHandleContext>>(TemplateRef),
            (element, context, injector) => {
                bindPart(
                    this.context,
                    element,
                    "resize-handle",
                    () => {
                        const occurrenceId = this.event.occurrenceId();
                        const date = this.event.date();
                        return occurrenceId !== undefined && date !== undefined
                            ? {
                                  occurrenceId,
                                  date,
                                  edge: context.$implicit.edge,
                              }
                            : undefined;
                    },
                    { injector },
                );
            },
        );
        effect(() => {
            const edge = this.edge();
            views.sync(
                this.installed() && edge !== undefined
                    ? [{ key: edge, context: { $implicit: { edge } } }]
                    : [],
            );
        });
        onDestroy(() => views.clear());
    }
}
