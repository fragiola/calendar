import {
    computed,
    Directive,
    effect,
    inject,
    TemplateRef,
    ViewContainerRef,
} from "@angular/core";
import type { Segment, TimeSegment } from "@fragiola/calendar";
import {
    bindPart,
    bindStructuralStyle,
    calendarValue,
    injectCalendarContext,
    injectFeature,
    injectWhere,
    onDestroy,
    PartViews,
    previewSegmentsIn,
    previewStyle,
} from "@fragiola/calendar-angular/internal";

export interface SelectionState {
    /** the highlight's part here: a time-grid segment (in a column) or a day-grid segment (in a row) */
    segment: TimeSegment | Segment;
    /** the range is still being selected (a pointer, Shift + arrows), not set yet */
    pending: boolean;
}

/** The context of the `calendarSelection` template: its state (`let-selection`). */
export interface SelectionContext {
    $implicit: SelectionState;
}

/**
 * The highlight of the range selected (or being selected) with `selection()`, laid out as an
 * event: `<div *calendarSelection="let selection"></div>`. In a `[calendarColumn]` it is
 * positioned as a timed event; in a `[calendarWeek]` or `[calendarAllDayRow]` it renders the row's
 * segment, over its days (the row is its containing block; `--calendar-row-inset` is the row's
 * space before its first day: a week number, a label). Rendered only where the range is; hidden
 * from assistive technology (the days and slots carry `data-selected`).
 */
@Directive({ selector: "ng-template[calendarSelection]" })
export class CalendarSelectionDirective {
    static ngTemplateContextGuard(
        _directive: CalendarSelectionDirective,
        _context: unknown,
    ): _context is SelectionContext {
        return true;
    }

    private readonly context = injectCalendarContext("*calendarSelection");
    private readonly installed = injectFeature(
        this.context,
        "selection",
        "*calendarSelection",
    );
    private readonly where = injectWhere();
    private readonly shown = calendarValue(
        this.context,
        () => this.context.engine()?.get("selection-segments") ?? null,
    );
    private readonly pending = calendarValue(
        this.context,
        () =>
            (this.context.engine()?.get("selection-preview") ?? null) !== null,
    );
    private readonly segments = computed(() =>
        this.installed() ? previewSegmentsIn(this.shown(), this.where()) : [],
    );

    constructor() {
        const views = new PartViews<SelectionContext>(
            inject(ViewContainerRef),
            inject<TemplateRef<SelectionContext>>(TemplateRef),
            (element, context, injector) => {
                bindPart(this.context, element, "selection", () => ({}), {
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
            const pending = this.pending();
            views.sync(
                this.segments().map((segment, index) => ({
                    // a range has one segment per place
                    key: String(index),
                    context: { $implicit: { segment, pending } },
                })),
            );
        });
        onDestroy(() => views.clear());
    }
}
