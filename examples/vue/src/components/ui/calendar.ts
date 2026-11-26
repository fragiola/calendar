// Vue port of the Fragiola UI calendar (examples/react/src/components/ui/calendar.tsx): a month grid
// for choosing one date (the APG date grid), with the same parts, `data-slot`s, roles, classes and
// palette roles (the `calendar` family, each cell's state a foundation member). Imported by the
// examples as `DatePicker` (the calendar package has its own `Calendar`).
//
// What differs from the React one, and why:
//   - Fragiola Primitives' Calendar is React only and Reka UI's takes `@internationalized/date`
//     values; this one is written here over the same plain dates as React's, `{ year, month, day }`
//     (`PlainDate`), so the example code stays React's: `:value="plainDate(anchor)"` and
//     `@value-change="(date) => …"` (React's `value` / `onValueChange`; `v-model:value` binds it).
//   - The keyboard is the APG date grid's, as React's: the arrows move by a day (swapped in RTL),
//     Up and Down by a week, Page Up and Down by a month (Shift: a year), Home and End to the week's
//     ends, Enter and Space choose. A day is chosen by a press too.
//   - Only the single-date calendar: no range, no multiple selection, no unavailable dates, no
//     min/max (the examples choose one day).

import { ChevronLeftIcon, ChevronRightIcon } from "@lucide/vue";
import {
    type ComputedRef,
    computed,
    defineComponent,
    h,
    type InjectionKey,
    inject,
    nextTick,
    type PropType,
    provide,
    type Ref,
    ref,
    useId,
    watch,
} from "vue";
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

// ─── The root's context ───────────────────────────────────────────────────────

interface CalendarContext {
    locale: ComputedRef<string>;
    firstDay: ComputedRef<number>;
    /** the first visible month (its day 1) */
    visibleStart: Ref<PlainDate>;
    visibleMonths: ComputedRef<number>;
    focused: Ref<PlainDate>;
    selected: ComputedRef<PlainDate | null>;
    disabled: ComputedRef<boolean>;
    cells: Map<string, HTMLElement>;
    select(date: PlainDate): void;
    /** moves the focus (and the visible months with it), then focuses the cell */
    moveFocus(date: PlainDate, focus: boolean): void;
    page(delta: number): void;
    headingId(offset: number): string;
    gridId(offset: number): string;
}

const CONTEXT: InjectionKey<CalendarContext> = Symbol("calendar");
const MONTH: InjectionKey<ComputedRef<PlainDate>> = Symbol("calendar-month");

function useContext(part: string): CalendarContext {
    const context = inject(CONTEXT, undefined);
    if (!context) throw new Error(`${part} must be inside Calendar.Root`);
    return context;
}

const monthStart = (date: PlainDate): PlainDate => ({
    year: date.year,
    month: date.month,
    day: 1,
});
const monthIndex = (date: PlainDate) => date.year * 12 + date.month;

const CalendarRoot = defineComponent({
    name: "CalendarRoot",
    inheritAttrs: false,
    props: {
        /** the chosen date (controlled); `null` is none */
        value: {
            type: Object as PropType<PlainDate | null>,
            default: undefined,
        },
        defaultValue: {
            type: Object as PropType<PlainDate | null>,
            default: null,
        },
        /** the `Intl` locale of the names (default: the document's language, else en-US) */
        locale: { type: String, default: undefined },
        /** the months shown side by side */
        visibleMonths: { type: Number, default: 1 },
        disabled: { type: Boolean, default: false },
    },
    emits: {
        valueChange: (_value: PlainDate | null) => true,
        "update:value": (_value: PlainDate | null) => true,
    },
    setup(props, { attrs, slots, emit }) {
        const own = ref<PlainDate | null>(props.defaultValue);
        const selected = computed(() =>
            props.value === undefined ? own.value : props.value,
        );
        const locale = computed(
            () =>
                props.locale ??
                (typeof document === "undefined"
                    ? undefined
                    : document.documentElement.lang) ??
                "en-US",
        );
        const firstDay = computed(() => firstDayOf(locale.value || "en-US"));
        const initial = selected.value ?? today();
        const focused = ref<PlainDate>(initial);
        const visibleStart = ref<PlainDate>(monthStart(initial));
        const visibleMonths = computed(() => Math.max(1, props.visibleMonths));
        const cells = new Map<string, HTMLElement>();
        const id = useId();

        /** Shows `date`'s month if it is not visible. */
        const reveal = (date: PlainDate) => {
            const first = monthIndex(visibleStart.value);
            const at = monthIndex(date);
            if (at < first) visibleStart.value = monthStart(date);
            else if (at >= first + visibleMonths.value) {
                visibleStart.value = addMonths(
                    monthStart(date),
                    1 - visibleMonths.value,
                );
            }
        };

        // a value set from outside (the calendar's anchor) is shown and focused: by its day, not
        // its object (a parent passes a new one on each render, which must not undo a paging)
        watch(
            () => (selected.value ? keyOf(selected.value) : null),
            () => {
                const date = selected.value;
                if (!date) return;
                focused.value = date;
                reveal(date);
            },
        );

        const context: CalendarContext = {
            locale: computed(() => locale.value || "en-US"),
            firstDay,
            visibleStart,
            visibleMonths,
            focused,
            selected,
            disabled: computed(() => props.disabled),
            cells,
            select(date) {
                if (props.disabled) return;
                own.value = date;
                focused.value = date;
                emit("update:value", date);
                emit("valueChange", date);
            },
            moveFocus(date, focus) {
                focused.value = date;
                reveal(date);
                if (focus) {
                    void nextTick().then(() =>
                        cells.get(keyOf(date))?.focus({ preventScroll: true }),
                    );
                }
            },
            page(delta) {
                visibleStart.value = addMonths(
                    visibleStart.value,
                    delta * visibleMonths.value,
                );
                focused.value = addMonths(
                    focused.value,
                    delta * visibleMonths.value,
                );
            },
            headingId: (offset) => `${id}-heading-${offset}`,
            gridId: (offset) => `${id}-grid-${offset}`,
        };
        provide(CONTEXT, context);

        return () =>
            h(
                "div",
                {
                    "data-slot": "calendar",
                    "data-disabled": props.disabled ? "" : undefined,
                    ...attrs,
                    class: cn(calendar.root(), attrs.class as string),
                },
                slots.default?.(),
            );
    },
});

// ─── The parts ────────────────────────────────────────────────────────────────

function box(name: string, slot: string, classes: string) {
    return defineComponent({
        name,
        inheritAttrs: false,
        setup(_, { attrs, slots }) {
            return () =>
                h(
                    "div",
                    {
                        "data-slot": slot,
                        ...attrs,
                        class: cn(classes, attrs.class as string),
                    },
                    slots.default?.(),
                );
        },
    });
}

const CalendarMonths = box(
    "CalendarMonths",
    "calendar-months",
    calendar.months(),
);
const CalendarMonth = box("CalendarMonth", "calendar-month", calendar.month());
const CalendarHeader = box(
    "CalendarHeader",
    "calendar-header",
    calendar.header(),
);

const CalendarHeading = defineComponent({
    name: "CalendarHeading",
    inheritAttrs: false,
    props: { offset: { type: Number, default: 0 } },
    setup(props, { attrs, slots }) {
        const context = useContext("Calendar.Heading");
        return () => {
            const month = addMonths(context.visibleStart.value, props.offset);
            return h(
                "h2",
                {
                    id: context.headingId(props.offset),
                    "aria-live": props.offset === 0 ? "polite" : undefined,
                    "data-slot": "calendar-heading",
                    ...attrs,
                    class: cn(calendar.heading(), attrs.class as string),
                },
                slots.default?.() ??
                    format(context.locale.value, {
                        month: "long",
                        year: "numeric",
                    }).format(toUtc(month)),
            );
        };
    },
});

/** A page button's look: a small icon button at the header's inline end. */
function pageButtonClass(side: "prev" | "next", className: unknown) {
    return cn(
        clickable({ variant: "icon", shape: "square", size: "sm" }),
        foundation.secondary(),
        foundation.disabled(),
        calendar[side](),
        className as string,
    );
}

function pageButton(name: string, side: "prev" | "next") {
    const delta = side === "prev" ? -1 : 1;
    return defineComponent({
        name,
        inheritAttrs: false,
        setup(_, { attrs, slots }) {
            const context = useContext(`Calendar.${name}`);
            return () => {
                const disabled = context.disabled.value;
                const grids = Array.from(
                    { length: context.visibleMonths.value },
                    (_, offset) => context.gridId(offset),
                ).join(" ");
                return h(
                    "button",
                    {
                        type: "button",
                        disabled,
                        "aria-controls": grids,
                        "aria-label":
                            side === "prev" ? "Previous month" : "Next month",
                        "data-slot": `calendar-${side}-button`,
                        "data-disabled": disabled ? "" : undefined,
                        ...attrs,
                        class: pageButtonClass(side, attrs.class),
                        onClick: () => context.page(delta),
                    },
                    slots.default?.() ??
                        h(
                            side === "prev"
                                ? ChevronLeftIcon
                                : ChevronRightIcon,
                            { "aria-hidden": "true", class: "rtl:rotate-180" },
                        ),
                );
            };
        },
    });
}

const CalendarPrevButton = pageButton("PrevButton", "prev");
const CalendarNextButton = pageButton("NextButton", "next");

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

const CalendarHeaderCell = defineComponent({
    name: "CalendarHeaderCell",
    inheritAttrs: false,
    props: {
        weekday: {
            type: Object as PropType<{
                index: number;
                short: string;
                long: string;
            }>,
            required: true,
        },
    },
    setup(props, { attrs, slots }) {
        return () =>
            h(
                "th",
                {
                    scope: "col",
                    abbr: props.weekday.long,
                    "data-slot": "calendar-header-cell",
                    ...attrs,
                    class: cn(calendar.headerCell(), attrs.class as string),
                },
                slots.default?.() ?? props.weekday.short,
            );
    },
});

const CalendarGridHeader = defineComponent({
    name: "CalendarGridHeader",
    inheritAttrs: false,
    setup(_, { attrs }) {
        const context = useContext("Calendar.GridHeader");
        return () => {
            const locale = context.locale.value;
            const short = format(locale, { weekday: "short" });
            const long = format(locale, { weekday: "long" });
            // 2023-01-01 is a Sunday
            const days = Array.from({ length: 7 }, (_, offset) => {
                const index = (context.firstDay.value + offset) % 7;
                const date = toUtc({ year: 2023, month: 1, day: 1 + index });
                return {
                    index,
                    short: short.format(date),
                    long: long.format(date),
                };
            });
            return h(
                "thead",
                { "data-slot": "calendar-grid-header", ...attrs },
                h(
                    "tr",
                    days.map((weekday) =>
                        h(CalendarHeaderCell, { key: weekday.index, weekday }),
                    ),
                ),
            );
        };
    },
});

const CalendarCell = defineComponent({
    name: "CalendarCell",
    inheritAttrs: false,
    props: {
        date: { type: Object as PropType<PlainDate>, required: true },
    },
    setup(props, { attrs, slots }) {
        const context = useContext("Calendar.Cell");
        const month = inject(MONTH, undefined);
        const key = computed(() => keyOf(props.date));
        const register = (element: unknown) => {
            if (element instanceof HTMLElement) {
                context.cells.set(key.value, element);
            } else if (context.cells.get(key.value)) {
                context.cells.delete(key.value);
            }
        };
        return () => {
            const date = props.date;
            const outside =
                month !== undefined &&
                (date.year !== month.value.year ||
                    date.month !== month.value.month);
            const selected = same(context.selected.value, date);
            const isToday = same(today(), date);
            const focused = same(context.focused.value, date);
            const disabled = context.disabled.value;
            const checked = !outside && selected;
            const inert = outside || disabled;
            const locale = context.locale.value;
            return h(
                "td",
                {
                    ref: outside ? undefined : register,
                    role: "gridcell",
                    "aria-label": format(locale, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    }).format(toUtc(date)),
                    tabindex: outside
                        ? undefined
                        : focused && !disabled
                          ? 0
                          : -1,
                    "aria-selected": selected ? "true" : undefined,
                    "aria-disabled": disabled || outside ? "true" : undefined,
                    "aria-current": isToday ? "date" : undefined,
                    "data-slot": "calendar-cell",
                    "data-today": isToday ? "" : undefined,
                    "data-selected": selected ? "" : undefined,
                    "data-disabled": disabled ? "" : undefined,
                    "data-outside-month": outside ? "" : undefined,
                    ...attrs,
                    class: cn(calendar.cell(), attrs.class as string),
                    onMousedown: (event: MouseEvent) => {
                        if (disabled) event.preventDefault();
                    },
                    onClick: () => {
                        if (outside || disabled) return;
                        context.select(date);
                        context.moveFocus(date, true);
                    },
                    onFocus: () => {
                        if (!outside && !focused)
                            context.moveFocus(date, false);
                    },
                },
                h(
                    "span",
                    {
                        "data-slot": "calendar-item",
                        "data-checked": checked ? "" : undefined,
                        "data-active":
                            isToday && !checked && !outside ? "" : undefined,
                        "data-disabled": inert ? "" : undefined,
                        "data-outside-month": outside ? "" : undefined,
                        class: cn(
                            calendar.item(),
                            // the hover only where a press chooses: a chosen box keeps its `ring`
                            inert || checked ? undefined : foundation.hover(),
                        ),
                    },
                    slots.default?.() ??
                        format(locale, { day: "numeric" }).format(toUtc(date)),
                ),
            );
        };
    },
});

const CalendarRow = defineComponent({
    name: "CalendarRow",
    inheritAttrs: false,
    props: {
        week: { type: Array as PropType<PlainDate[]>, required: true },
    },
    setup(props, { attrs, slots }) {
        return () =>
            h(
                "tr",
                { "data-slot": "calendar-row", ...attrs },
                props.week.map((date) =>
                    slots.default
                        ? slots.default({ date })
                        : h(CalendarCell, { key: keyOf(date), date }),
                ),
            );
    },
});

const CalendarGridBody = defineComponent({
    name: "CalendarGridBody",
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
        const context = useContext("Calendar.GridBody");
        const month = inject(MONTH, undefined);
        return () => {
            const weeks = monthGrid(
                month?.value ?? context.visibleStart.value,
                context.firstDay.value,
            );
            return h(
                "tbody",
                { "data-slot": "calendar-grid-body", ...attrs },
                weeks.map((week) =>
                    slots.default
                        ? slots.default({ week })
                        : h(CalendarRow, {
                              key: keyOf(week[0] as PlainDate),
                              week,
                          }),
                ),
            );
        };
    },
});

const CalendarGrid = defineComponent({
    name: "CalendarGrid",
    inheritAttrs: false,
    props: { offset: { type: Number, default: 0 } },
    setup(props, { attrs, slots }) {
        const context = useContext("Calendar.Grid");
        const month = computed(() =>
            addMonths(context.visibleStart.value, props.offset),
        );
        provide(MONTH, month);
        const onKeydown = (event: KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                context.select(context.focused.value);
                return;
            }
            const element = event.currentTarget as HTMLElement;
            const target = keyTarget(event.key, context.focused.value, {
                rtl: getComputedStyle(element).direction === "rtl",
                firstDay: context.firstDay.value,
                shiftKey: event.shiftKey,
            });
            if (target === null) return;
            event.preventDefault();
            context.moveFocus(target, true);
        };
        return () =>
            h(
                "table",
                {
                    role: "grid",
                    id: context.gridId(props.offset),
                    "aria-labelledby": context.headingId(props.offset),
                    "aria-disabled": context.disabled.value
                        ? "true"
                        : undefined,
                    "data-slot": "calendar-grid",
                    ...attrs,
                    class: cn(calendar.grid(), attrs.class as string),
                    onKeydown,
                },
                slots.default?.() ?? [
                    h(CalendarGridHeader),
                    h(CalendarGridBody),
                ],
            );
    },
});

/** Every visible month: a header and a grid each, the page buttons on the outer ones. */
const CalendarPages = defineComponent({
    name: "CalendarPages",
    props: { count: { type: Number, default: 1 } },
    setup(props) {
        return () => {
            const count = Math.max(1, props.count);
            return h(CalendarMonths, null, {
                default: () =>
                    Array.from({ length: count }, (_, offset) =>
                        h(
                            CalendarMonth,
                            { key: offset },
                            {
                                default: () => [
                                    h(CalendarHeader, null, {
                                        default: () => [
                                            offset === 0
                                                ? h(CalendarPrevButton)
                                                : null,
                                            h(CalendarHeading, { offset }),
                                            offset === count - 1
                                                ? h(CalendarNextButton)
                                                : null,
                                        ],
                                    }),
                                    h(CalendarGrid, { offset }),
                                ],
                            },
                        ),
                    ),
            });
        };
    },
});

/** The whole calendar from its Root's props: every visible month. */
const CalendarTemplateSimple = defineComponent({
    name: "CalendarTemplateSimple",
    inheritAttrs: false,
    props: { visibleMonths: { type: Number, default: 1 } },
    setup(props, { attrs, slots }) {
        return () =>
            h(
                CalendarRoot,
                { ...attrs, visibleMonths: props.visibleMonths },
                {
                    default: () => [
                        h(CalendarPages, { count: props.visibleMonths }),
                        slots.default?.(),
                    ],
                },
            );
    },
});

export const Calendar = {
    Root: CalendarRoot,
    Months: CalendarMonths,
    Month: CalendarMonth,
    Header: CalendarHeader,
    Heading: CalendarHeading,
    PrevButton: CalendarPrevButton,
    NextButton: CalendarNextButton,
    Grid: CalendarGrid,
    GridHeader: CalendarGridHeader,
    HeaderCell: CalendarHeaderCell,
    GridBody: CalendarGridBody,
    Row: CalendarRow,
    Cell: CalendarCell,
    Template: { Simple: CalendarTemplateSimple },
};
