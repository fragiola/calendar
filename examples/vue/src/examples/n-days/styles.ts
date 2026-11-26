import type { SegmentState, TimeEventState } from "@fragiola/calendar-vue";
import { cn } from "#/lib/cn";
import { paletteOf } from "../_kit/data";

// How n-days looks: one class string (or state function) per part, read by the SFCs. Colours come
// from the palette roles, sizes and shapes from the theme's --cal-* tokens. The time axis is 4rem
// wide (--axis): the header row and the all-day row start after it (--calendar-row-inset), and the
// layer of columns is laid over the slot rows after it. Rows are flex rows: one column or seven.

export const root = cn(
    "palette-surface flex h-full min-h-0 flex-col gap-3 bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--cal-font) text-(length:--cal-size)",
    "[--axis:4rem] [--calendar-lane-size:var(--cal-lane-size)] [--calendar-row-inset:var(--axis)]",
);

export const toolbar = "flex items-center gap-2";

export const title = "me-auto text-lg font-semibold";

export const button = cn(
    "palette-raised h-8 rounded-(--cal-radius) border border-palette-line bg-palette-base px-3 text-sm",
    "hover:bg-palette-soft focus-visible:outline-(length:--cal-focus-width) focus-visible:outline-palette-ring",
    "data-disabled:opacity-50",
);

export const iconButton = cn(
    button,
    "flex w-8 items-center justify-center px-0",
);

export const flip = "size-4 rtl:-scale-x-100";

export const grid = cn(
    "palette-raised flex min-h-0 flex-1 flex-col overflow-hidden bg-palette-base shadow-(--cal-shadow)",
    "rounded-(--cal-radius) border-(length:--cal-grid-width) border-(color:--cal-line) [border-style:var(--cal-grid-style)]",
);

const line = "border-(color:--cal-line) [border-style:var(--cal-grid-style)]";

export const headers = cn(
    "flex ps-(--axis) border-b-(length:--cal-grid-width)",
    line,
);

export const header = cn(
    "min-w-0 flex-1 px-2 py-1.5 text-center text-xs text-palette-accent/85",
    "font-(weight:--cal-header-weight) [text-transform:var(--cal-header-case)]",
    "data-today:font-semibold data-today:text-palette-contrast",
);

export const allDayRow = cn("flex border-b-(length:--cal-grid-width)", line);

export const allDayLabel =
    "w-(--axis) shrink-0 self-center pe-2 text-end text-xs text-palette-accent/85";

export const allDayCell = cn(
    "min-h-8 min-w-0 flex-1 border-s-(length:--cal-grid-width) p-1 outline-none",
    line,
    "[--calendar-day-gap:calc(0.5rem+var(--cal-grid-width))]",
    "focus-visible:outline-(length:--cal-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-palette-ring",
);

export const segment = (state: SegmentState) =>
    cn(
        `palette-${paletteOf(state.calendarId)}`,
        "flex cursor-default py-px outline-none select-none",
        "[&:focus-visible>span]:outline-(length:--cal-focus-width) [&:focus-visible>span]:outline-palette-ring",
    );

export const segmentLabel = cn(
    "flex min-w-0 flex-1 items-center truncate rounded-(--cal-event-radius) bg-(--cal-event-bg) px-1.5 text-xs text-(--cal-event-fg)",
    "border-s-(length:--cal-event-stripe) border-(color:--cal-event-stripe-color)",
);

export const scroller = "relative min-h-0 flex-1 overflow-auto";

export const body = "relative";

export const slotRow = "flex h-(--cal-slot-height)";

export const slotLabel =
    "relative w-(--axis) shrink-0 pe-2 text-end text-xs text-palette-accent/85";

export const slotTime = "relative -top-2";

export const slot = cn(
    "min-w-0 flex-1 border-s-(length:--cal-grid-width) border-t-(length:--cal-grid-width) outline-none",
    line,
    "data-past:bg-palette-soft/30 hover:bg-(--cal-hover-bg)",
    "focus-visible:outline-(length:--cal-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-palette-ring",
);

export const columns = "absolute inset-y-0 start-(--axis) end-0 flex";

export const column = "min-w-0 flex-1";

export const event = (state: TimeEventState) =>
    cn(
        `palette-${paletteOf(state.calendarId)}`,
        "cursor-default p-px outline-none select-none",
        "[&:focus-visible>span]:outline-(length:--cal-focus-width) [&:focus-visible>span]:outline-palette-ring",
    );

export const eventBox = cn(
    "flex size-full flex-col overflow-hidden rounded-(--cal-event-radius) bg-(--cal-event-bg) p-(--cal-event-padding) text-xs text-(--cal-event-fg)",
    "border-s-(length:--cal-event-stripe) border-(color:--cal-event-stripe-color)",
);

export const eventTitle = "truncate font-medium";

export const eventTime = "truncate opacity-80";

export const lengths = cn(
    "palette-raised flex overflow-hidden rounded-(--cal-radius) border border-palette-line",
);

/** The pressed length (`aria-pressed`, `data-pressed`) is the view shown. */
export const length = cn(
    "h-8 bg-palette-base px-3 text-sm not-first:border-s not-first:border-palette-line",
    "hover:bg-palette-soft data-pressed:bg-palette-soft data-pressed:font-semibold",
    "focus-visible:outline-(length:--cal-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-palette-ring",
);
