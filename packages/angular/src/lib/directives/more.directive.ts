import {
    computed,
    Directive,
    effect,
    inject,
    TemplateRef,
    ViewContainerRef,
} from "@angular/core";
import {
    bindPart,
    CALENDAR_DAY,
    injectCalendarContext,
    injectRequired,
    onDestroy,
    PartViews,
} from "@fragiola/calendar-angular/internal";

export interface MoreState {
    /** how many occurrences of the day do not fit */
    hiddenCount: number;
    /** their ids, for the app's popover */
    hiddenOccurrenceIds: readonly string[];
    /** the day, `YYYY-MM-DD` */
    date: string;
}

/** The context of the `calendarMore` template: its state (`let-more`). */
export interface MoreContext {
    $implicit: MoreState;
}

/**
 * A day's "+N more" trigger, rendered only while some of the day's occurrences do not fit
 * (`dayMaxEvents`): `<button *calendarMore="let more">+{{ more.hiddenCount }}</button>` inside a
 * `[calendarDay]`; its element is the part (`data-calendar-part="more"`, `type="button"` on a
 * button with none). A press, or Enter, is the engine's `more-click` (the root's `(moreClick)`):
 * the popover is yours. On the keyboard it is the last item of the day's events: Down from the last
 * one reaches it, Up goes back, Escape returns to the day.
 */
@Directive({ selector: "ng-template[calendarMore]" })
export class CalendarMoreDirective {
    static ngTemplateContextGuard(
        _directive: CalendarMoreDirective,
        _context: unknown,
    ): _context is MoreContext {
        return true;
    }

    private readonly context = injectCalendarContext("*calendarMore");
    private readonly day = injectRequired(
        CALENDAR_DAY,
        "*calendarMore",
        "[calendarDay]",
    );

    /** what it shows; `undefined` while every occurrence of the day fits */
    readonly state = computed((): MoreState | undefined => {
        const day = this.day.day();
        return day && day.hiddenCount > 0
            ? {
                  hiddenCount: day.hiddenCount,
                  hiddenOccurrenceIds: day.hiddenOccurrenceIds,
                  date: day.date,
              }
            : undefined;
    });

    constructor() {
        const views = new PartViews<MoreContext>(
            inject(ViewContainerRef),
            inject<TemplateRef<MoreContext>>(TemplateRef),
            (element, context, injector) => {
                // a button of its own, outside the grid's roving focus: the last item of the
                // day's events (your attributes win)
                if (
                    element.tagName === "BUTTON" &&
                    !element.hasAttribute("type")
                ) {
                    element.setAttribute("type", "button");
                }
                if (!element.hasAttribute("tabindex")) {
                    element.setAttribute("tabindex", "-1");
                }
                bindPart(
                    this.context,
                    element,
                    "more",
                    () => ({ date: context.$implicit.date }),
                    { injector },
                );
            },
        );
        effect(() => {
            const state = this.state();
            views.sync(
                state ? [{ key: "more", context: { $implicit: state } }] : [],
            );
        });
        onDestroy(() => views.clear());
    }
}
