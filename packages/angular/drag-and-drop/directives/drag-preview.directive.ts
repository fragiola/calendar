import {
    Directive,
    effect,
    inject,
    TemplateRef,
    ViewContainerRef,
} from "@angular/core";
import type {
    DragPreview as Preview,
    Segment,
    TimeSegment,
} from "@fragiola/calendar";
import {
    bindPart,
    bindStructuralStyle,
    calendarValue,
    injectCalendarContext,
    injectWhere,
    onDestroy,
    PartViews,
    previewSegmentsIn,
    previewStyle,
} from "@fragiola/calendar-angular/internal";
import { previewOf } from "../inject/inject-drag-preview";

export interface DragPreviewState {
    /** the moved, resized or dropped-in occurrence where it would land: its times */
    preview: Preview;
    /** its part here: a time-grid segment (in a column) or a day-grid segment (in a row) */
    segment: TimeSegment | Segment;
}

/** The context of the `calendarDragPreview` template: its state (`let-preview`). */
export interface DragPreviewContext {
    $implicit: DragPreviewState;
}

/**
 * Where a drag (`dragAndDrop()`, `externalDrop()`) or a resize (`resize()`) would put the
 * occurrence, laid out as the event: `<div *calendarDragPreview="let preview"></div>`. In a
 * `[calendarColumn]` it is positioned as a timed event; in a `[calendarWeek]` or
 * `[calendarAllDayRow]` it renders the row's segment, over its days (the row is its containing
 * block; `--calendar-row-inset` is the row's space before its first day). Rendered only while
 * there is a target there; hidden from assistive technology (`(announce)` tells).
 */
@Directive({ selector: "ng-template[calendarDragPreview]" })
export class CalendarDragPreviewDirective {
    static ngTemplateContextGuard(
        _directive: CalendarDragPreviewDirective,
        _context: unknown,
    ): _context is DragPreviewContext {
        return true;
    }

    private readonly context = injectCalendarContext("*calendarDragPreview");
    private readonly where = injectWhere();
    /** the preview where this one is: a move elsewhere keeps it null (nothing runs here) */
    private readonly shown = calendarValue(
        this.context,
        () => {
            const preview = previewOf(this.context.engine());
            const segments = previewSegmentsIn(preview, this.where());
            return preview && segments.length > 0
                ? { preview, segments }
                : null;
        },
        { part: "drag-preview" },
    );

    constructor() {
        const views = new PartViews<DragPreviewContext>(
            inject(ViewContainerRef),
            inject<TemplateRef<DragPreviewContext>>(TemplateRef),
            (element, context, injector) => {
                bindPart(this.context, element, "drag-preview", () => ({}), {
                    register: false,
                    injector,
                });
                bindStructuralStyle(
                    element,
                    () => previewStyle(context.$implicit.segment, this.where()),
                    injector,
                );
            },
        );
        effect(() => {
            const shown = this.shown();
            views.sync(
                shown
                    ? shown.segments.map((segment, index) => ({
                          // a preview has one segment per place
                          key: String(index),
                          context: {
                              $implicit: { preview: shown.preview, segment },
                          },
                      }))
                    : [],
            );
        });
        onDestroy(() => views.clear());
    }
}
