// Angular port of the Fragiola UI calendar (examples/react/src/components/ui/calendar.tsx): a month
// grid for choosing one date (the APG date grid), with the same `data-slot`s, roles, classes and
// palette roles (the `calendar` family, each cell's state a foundation member). The component is
// `DatePicker` (`<kit-date-picker>`): the calendar package has its own calendar.
//
// What differs from the React one, and why:
//   - Fragiola Primitives' Calendar is React only; this one is written here over the same plain
//     dates as React's, `{ year, month, day }` (`PlainDate`), so the example code stays React's:
//     `[value]="plainDate(anchor)"` and `(valueChange)="goTo($event)"` (React's `value` /
//     `onValueChange`; `[(value)]` binds it).
//   - One component, React's `Calendar.Template.Simple`: one month, its header (the heading and
//     the page buttons) and its grid; no parts to recompose.
//   - The keyboard is the APG date grid's, as React's: the arrows move by a day (swapped in RTL),
//     Up and Down by a week, Page Up and Down by a month (Shift: a year), Home and End to the week's
//     ends, Enter and Space choose. A day is chosen by a press too.
//   - Only the single-date calendar: no range, no multiple selection, no unavailable dates, no
//     min/max (the examples choose one day).

import {
    afterRenderEffect,
    booleanAttribute,
    Component,
    computed,
    ElementRef,
    effect,
    inject,
    input,
    model,
    signal,
    untracked,
} from "@angular/core";
import { LucideChevronLeft, LucideChevronRight } from "@lucide/angular";
import { clickable } from "#/components/atoms/clickable";
import { calendar } from "#/components/families/calendar";
import { foundation } from "#/components/families/foundation";
import { cn } from "#/lib/cn";

/** A date with no time nor zone, as React's calendar takes it. */
export interface PlainDate {
    year: number;
    month: number;
    day: number;
}

// ─── Date math (UTC, so no zone or DST shifts a day) ──────────────────────────

const toUtc = (date: PlainDate) =>
    new Date(Date.UTC(date.year, date.month - 1, date.day));
const fromUtc = (date: Date): PlainDate => ({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
});
const keyOf = (date: PlainDate) =>
    `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
const same = (a: PlainDate | null | undefined, b: PlainDate) =>
    !!a && a.year === b.year && a.month === b.month && a.day === b.day;

function addDays(date: PlainDate, days: number): PlainDate {
    const next = toUtc(date);
    next.setUTCDate(next.getUTCDate() + days);
    return fromUtc(next);
}

/** The same day `months` later, clamped to the month's last day. */
function addMonths(date: PlainDate, months: number): PlainDate {
    const index = date.year * 12 + (date.month - 1) + months;
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return { year, month, day: Math.min(date.day, last) };
}

/** 0 (Sunday) to 6 (Saturday). */
const weekdayOf = (date: PlainDate) => toUtc(date).getUTCDay();

/** The locale's first day of the week, 0 (Sunday) to 6. */
function firstDayOf(locale: string): number {
    try {
        const info = new Intl.Locale(locale) as Intl.Locale & {
            getWeekInfo?: () => { firstDay: number };
            weekInfo?: { firstDay: number };
        };
        const first = (info.getWeekInfo?.() ?? info.weekInfo)?.firstDay;
        return first === undefined ? 0 : first % 7;
    } catch {
        return 0;
    }
}

/** The six weeks shown for a month, from the week holding its first day. */
function monthGrid(month: PlainDate, firstDay: number): PlainDate[][] {
    const first = { year: month.year, month: month.month, day: 1 };
    const start = addDays(first, -((weekdayOf(first) - firstDay + 7) % 7));
    return Array.from({ length: 6 }, (_, week) =>
        Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)),
    );
}

function today(): PlainDate {
    const now = new Date();
    return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
    };
}

const format = (locale: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options });

const monthStart = (date: PlainDate): PlainDate => ({
    year: date.year,
    month: date.month,
    day: 1,
});

/** The APG date grid's key, as the date it moves the focus to (`null`: not a key of the grid). */
function keyTarget(
    key: string,
    from: PlainDate,
    options: { rtl: boolean; firstDay: number; shiftKey: boolean },
): PlainDate | null {
    const back = options.rtl ? 1 : -1;
    switch (key) {
        case "ArrowLeft":
            return addDays(from, back);
        case "ArrowRight":
            return addDays(from, -back);
        case "ArrowUp":
            return addDays(from, -7);
        case "ArrowDown":
            return addDays(from, 7);
        case "PageUp":
            return addMonths(from, options.shiftKey ? -12 : -1);
        case "PageDown":
            return addMonths(from, options.shiftKey ? 12 : 1);
        case "Home":
            return addDays(
                from,
                -((weekdayOf(from) - options.firstDay + 7) % 7),
            );
        case "End":
            return addDays(
                from,
                6 - ((weekdayOf(from) - options.firstDay + 7) % 7),
            );
        default:
            return null;
    }
}

/** A page button's look: a small icon button at the header's inline end. */
function pageButtonClass(side: "prev" | "next") {
    return cn(
        clickable({ variant: "icon", shape: "square", size: "sm" }),
        foundation.secondary(),
        foundation.disabled(),
        calendar[side](),
    );
}

/** What a day's cell shows. */
interface Cell {
    date: PlainDate;
    key: string;
    label: string;
    number: string;
    outside: boolean;
    selected: boolean;
    today: boolean;
    focused: boolean;
    checked: boolean;
    inert: boolean;
    itemClass: string;
}

let pickers = 0;

@Component({
    selector: "kit-date-picker",
    imports: [LucideChevronLeft, LucideChevronRight],
    host: {
        "data-slot": "calendar",
        "[attr.data-disabled]": "disabled() ? '' : null",
        "[class]": "classes()",
    },
    template: `
        <div data-slot="calendar-months" [class]="parts.months">
            <div data-slot="calendar-month" [class]="parts.month">
                <div data-slot="calendar-header" [class]="parts.header">
                    <button
                        type="button"
                        aria-label="Previous month"
                        data-slot="calendar-prev-button"
                        [attr.aria-controls]="gridId"
                        [disabled]="disabled()"
                        [attr.data-disabled]="disabled() ? '' : null"
                        [class]="parts.prev"
                        (click)="page(-1)"
                    >
                        <svg lucideChevronLeft aria-hidden="true" class="rtl:rotate-180"></svg>
                    </button>
                    <h2
                        aria-live="polite"
                        data-slot="calendar-heading"
                        [id]="headingId"
                        [class]="parts.heading"
                    >{{ heading() }}</h2>
                    <button
                        type="button"
                        aria-label="Next month"
                        data-slot="calendar-next-button"
                        [attr.aria-controls]="gridId"
                        [disabled]="disabled()"
                        [attr.data-disabled]="disabled() ? '' : null"
                        [class]="parts.next"
                        (click)="page(1)"
                    >
                        <svg lucideChevronRight aria-hidden="true" class="rtl:rotate-180"></svg>
                    </button>
                </div>
                <table
                    role="grid"
                    data-slot="calendar-grid"
                    [id]="gridId"
                    [attr.aria-labelledby]="headingId"
                    [attr.aria-disabled]="disabled() ? 'true' : null"
                    [class]="parts.grid"
                    (keydown)="onKeydown($event)"
                >
                    <thead data-slot="calendar-grid-header">
                        <tr>
                            @for (weekday of weekdays(); track weekday.index) {
                                <th
                                    scope="col"
                                    data-slot="calendar-header-cell"
                                    [attr.abbr]="weekday.long"
                                    [class]="parts.headerCell"
                                >{{ weekday.short }}</th>
                            }
                        </tr>
                    </thead>
                    <tbody data-slot="calendar-grid-body">
                        @for (week of weeks(); track week[0]?.key) {
                            <tr data-slot="calendar-row">
                                @for (cell of week; track cell.key) {
                                    <td
                                        role="gridcell"
                                        data-slot="calendar-cell"
                                        [attr.data-key]="cell.key"
                                        [attr.aria-label]="cell.label"
                                        [attr.tabindex]="cell.outside ? null : cell.focused && !disabled() ? 0 : -1"
                                        [attr.aria-selected]="cell.selected ? 'true' : null"
                                        [attr.aria-disabled]="disabled() || cell.outside ? 'true' : null"
                                        [attr.aria-current]="cell.today ? 'date' : null"
                                        [attr.data-today]="cell.today ? '' : null"
                                        [attr.data-selected]="cell.selected ? '' : null"
                                        [attr.data-disabled]="disabled() ? '' : null"
                                        [attr.data-outside-month]="cell.outside ? '' : null"
                                        [class]="parts.cell"
                                        (mousedown)="disabled() && $event.preventDefault()"
                                        (click)="press(cell)"
                                        (focus)="!cell.outside && !cell.focused && moveFocus(cell.date, false)"
                                    >
                                        <span
                                            data-slot="calendar-item"
                                            [attr.data-checked]="cell.checked ? '' : null"
                                            [attr.data-active]="cell.today && !cell.checked && !cell.outside ? '' : null"
                                            [attr.data-disabled]="cell.inert ? '' : null"
                                            [attr.data-outside-month]="cell.outside ? '' : null"
                                            [class]="cell.itemClass"
                                        >{{ cell.number }}</span>
                                    </td>
                                }
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
        </div>
    `,
})
export class DatePicker {
    /** the chosen date; `null` is none */
    readonly value = model<PlainDate | null>(null);
    /** the `Intl` locale of the names (default: the document's language, else en-US) */
    readonly locale = input<string>();
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly class = input<string>();

    protected readonly parts = {
        months: calendar.months(),
        month: calendar.month(),
        header: calendar.header(),
        heading: calendar.heading(),
        grid: calendar.grid(),
        headerCell: calendar.headerCell(),
        cell: calendar.cell(),
        prev: pageButtonClass("prev"),
        next: pageButtonClass("next"),
    };
    protected readonly classes = computed(() =>
        cn(calendar.root(), this.class()),
    );
    protected readonly headingId: string;
    protected readonly gridId: string;
    private readonly element: HTMLElement = inject(ElementRef).nativeElement;
    private readonly language = computed(
        () =>
            this.locale() ||
            this.element.ownerDocument.documentElement.lang ||
            "en-US",
    );
    private readonly firstDay = computed(() => firstDayOf(this.language()));
    private readonly focused = signal<PlainDate>(today());
    /** the visible month (its day 1) */
    private readonly visible = signal<PlainDate>(monthStart(today()));
    /** the cell to focus after the next render */
    private focusNext: string | undefined;
    /** the day last chosen here (a press, Enter), by its key */
    private picked: string | undefined;

    protected readonly heading = computed(() =>
        format(this.language(), { month: "long", year: "numeric" }).format(
            toUtc(this.visible()),
        ),
    );

    protected readonly weekdays = computed(() => {
        const short = format(this.language(), { weekday: "short" });
        const long = format(this.language(), { weekday: "long" });
        // 2023-01-01 is a Sunday
        return Array.from({ length: 7 }, (_, offset) => {
            const index = (this.firstDay() + offset) % 7;
            const date = toUtc({ year: 2023, month: 1, day: 1 + index });
            return {
                index,
                short: short.format(date),
                long: long.format(date),
            };
        });
    });

    protected readonly weeks = computed((): Cell[][] => {
        const month = this.visible();
        const selected = this.value();
        const focused = this.focused();
        const now = today();
        const disabled = this.disabled();
        const label = format(this.language(), {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
        const number = format(this.language(), { day: "numeric" });
        return monthGrid(month, this.firstDay()).map((week) =>
            week.map((date) => {
                const outside =
                    date.year !== month.year || date.month !== month.month;
                const isSelected = same(selected, date);
                const checked = !outside && isSelected;
                const inert = outside || disabled;
                return {
                    date,
                    key: keyOf(date),
                    label: label.format(toUtc(date)),
                    number: number.format(toUtc(date)),
                    outside,
                    selected: isSelected,
                    today: same(now, date),
                    focused: same(focused, date),
                    checked,
                    inert,
                    itemClass: cn(
                        calendar.item(),
                        // the hover only where a press chooses: a chosen box keeps its `ring`
                        inert || checked ? undefined : foundation.hover(),
                    ),
                };
            }),
        );
    });

    constructor() {
        pickers += 1;
        this.headingId = `kit-date-picker-${pickers}-heading`;
        this.gridId = `kit-date-picker-${pickers}-grid`;
        // a value set from outside (the calendar's anchor) is shown and focused: by its day, not
        // its object (a parent passes a new one on each render, which must not undo a paging)
        const chosen = computed(() => {
            const value = this.value();
            return value ? keyOf(value) : null;
        });
        effect(() => {
            const key = chosen();
            // a day chosen here is already shown: only a value from outside moves the page
            if (key === null || key === this.picked) return;
            this.picked = undefined;
            const date = untracked(this.value);
            if (date) untracked(() => this.moveFocus(date, false));
        });
        afterRenderEffect(() => {
            this.weeks();
            const key = this.focusNext;
            this.focusNext = undefined;
            if (key === undefined) return;
            this.element
                .querySelector<HTMLElement>(`[data-key="${key}"]`)
                ?.focus({ preventScroll: true });
        });
    }

    /** Moves the focus (and the visible month with it), then focuses the cell. */
    protected moveFocus(date: PlainDate, focus: boolean) {
        this.focused.set(date);
        const visible = this.visible();
        if (date.year !== visible.year || date.month !== visible.month) {
            this.visible.set(monthStart(date));
        }
        if (focus) this.focusNext = keyOf(date);
    }

    protected page(delta: number) {
        this.visible.set(addMonths(this.visible(), delta));
        this.focused.set(addMonths(this.focused(), delta));
    }

    protected press(cell: Cell) {
        if (cell.outside || this.disabled()) return;
        this.choose(cell.date);
        this.moveFocus(cell.date, true);
    }

    private choose(date: PlainDate) {
        if (this.disabled()) return;
        this.focused.set(date);
        this.picked = keyOf(date);
        this.value.set(date);
    }

    protected onKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this.choose(this.focused());
            return;
        }
        const target = keyTarget(event.key, this.focused(), {
            rtl: getComputedStyle(this.element).direction === "rtl",
            firstDay: this.firstDay(),
            shiftKey: event.shiftKey,
        });
        if (target === null) return;
        event.preventDefault();
        this.moveFocus(target, true);
    }
}
