import {
    computed,
    Directive,
    type DoCheck,
    inject,
    input,
    type Signal,
} from "@angular/core";
import type { ListDay as ListDayLayout, ListItem } from "@fragiola/calendar";
import {
    beforeInputs,
    bindPart,
    CALENDAR_LIST_DAY,
    injectCalendarContext,
    injectHost,
    type ListDayContext,
    type SlotViews,
} from "@fragiola/calendar-angular/internal";
import { bindCollection, injectParent } from "../utils/collection";

export interface ListDayState {
    /** the day as the list layout gives it (`date`, `today`, `past`, `items`) */
    day: ListDayLayout;
    today: boolean;
}

/**
 * A list view's day (`role="list"`, `data-date`): `<div [calendarListDay]="day">` with an
 * `<ng-template calendarListDayItem let-item>` per occurrence. Its heading is yours, before it.
 */
@Directive({
    selector: "[calendarListDay]",
    exportAs: "calendarListDay",
    providers: [
        {
            provide: CALENDAR_LIST_DAY,
            useFactory: () => inject(CalendarListDayDirective).dayContext,
        },
    ],
})
export class CalendarListDayDirective {
    /** the day, from `<ng-template calendarListDays let-day>` */
    readonly calendarListDay = input.required<ListDayLayout>();

    private readonly context = injectCalendarContext("[calendarListDay]");
    private readonly day = computed(() =>
        beforeInputs(undefined, this.calendarListDay),
    );

    /** @internal what the parts inside read */
    readonly dayContext: ListDayContext = { day: this.day };

    /** what it shows (`undefined` until its day is set) */
    readonly state: Signal<ListDayState | undefined> = computed(() => {
        const day = this.day();
        return day ? { day, today: day.today } : undefined;
    });

    constructor() {
        bindPart(this.context, injectHost(), "list-day", () => {
            const day = this.day();
            return day ? { date: day.date } : undefined;
        });
    }
}

/** The context of the `calendarListDayItem` template: the occurrence (`let-item`). */
export interface ListDayItemContext {
    $implicit: ListItem;
    item: ListItem;
}

/**
 * Renders one occurrence of a `[calendarListDay]` (React's children function):
 * `<ng-template calendarListDayItem let-item>`, usually a `[calendarListEvent]`.
 */
@Directive({ selector: "ng-template[calendarListDayItem]" })
export class CalendarListDayItemDirective implements DoCheck {
    static ngTemplateContextGuard(
        _directive: CalendarListDayItemDirective,
        _context: unknown,
    ): _context is ListDayItemContext {
        return true;
    }

    private readonly listDay = injectParent(
        CalendarListDayDirective,
        "calendarListDayItem",
        "[calendarListDay]",
    );
    private readonly views: SlotViews<ListDayItemContext> = bindCollection(() =>
        (this.listDay.state()?.day.items ?? []).map((item) => ({
            key: item.occurrenceId,
            context: { $implicit: item, item },
        })),
    );

    /** its views are checked whenever the template it is in is (as embedded views are) */
    ngDoCheck(): void {
        this.views.markForCheck();
    }
}
