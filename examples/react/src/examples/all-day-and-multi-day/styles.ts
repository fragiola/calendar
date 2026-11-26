import type { SegmentState, TimeEventState } from "@fragiola/calendar-react";
import { cn } from "#/lib/cn";
import { paletteOf } from "../_kit/data";

// How all-day-and-multi-day looks: one class string (or state function) per part, read by
// index.tsx. Colours come from the palette roles, sizes and shapes from the theme's --cal-*
// tokens. A segment that goes on in another row loses its rounded corner on that side.

export const root = cn(
    "palette-surface flex h-full min-h-0 flex-col gap-3 bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--cal-font) text-(length:--cal-size)",
    "[--axis:4rem] [--calendar-lane-size:var(--cal-lane-size)] [--calendar-day-gap:calc(0.5rem+var(--cal-grid-width))]",
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

export const views =
    "palette-raised flex overflow-hidden rounded-(--cal-radius) border border-palette-line";

export const viewButton = cn(
    "h-8 bg-palette-base px-3 text-sm not-first:border-s not-first:border-palette-line",
    "hover:bg-palette-soft data-pressed:bg-palette-soft data-pressed:font-semibold",
    "focus-visible:outline-(length:--cal-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-palette-ring",
);

export const grid = cn(
    "palette-raised flex min-h-0 flex-1 flex-col overflow-auto bg-palette-base shadow-(--cal-shadow)",
    "rounded-(--cal-radius) border-(length:--cal-grid-width) border-(color:--cal-line) [border-style:var(--cal-grid-style)]",
);

const line = "border-(color:--cal-line) [border-style:var(--cal-grid-style)]";

const focus =
    "outline-none focus-visible:outline-(length:--cal-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-palette-ring";

export const monthHeaders = "flex";

export const weekHeaders = cn(
    "flex ps-(--axis) border-b-(length:--cal-grid-width)",
    line,
);

export const header = cn(
    "min-w-0 flex-1 px-2 py-1.5 text-center text-xs text-palette-accent/85",
    "font-(weight:--cal-header-weight) [text-transform:var(--cal-header-case)]",
);

/** A row grows with its lanes (the days' events hold them), and the grid scrolls. */
export const week = "flex flex-[1_0_auto]";

export const day = cn(
    "group/day flex min-w-0 flex-1 flex-col gap-0.5 p-1",
    "border-t-(length:--cal-grid-width) border-s-(length:--cal-grid-width) first:border-s-0",
    line,
    "data-weekend:bg-(--cal-weekend-bg) data-outside:text-palette-accent/70",
    focus,
);

export const dayNumber = cn(
    "flex size-(--cal-today-size) shrink-0 items-center justify-center rounded-(--cal-today-radius) text-xs",
    "group-data-today/day:bg-(--cal-today-bg) group-data-today/day:font-semibold group-data-today/day:text-(--cal-today-fg)",
);

export const dayEvents = "min-h-0";

export const segment = (state: SegmentState) =>
    cn(
        `palette-${paletteOf(state.calendarId)}`,
        "flex cursor-default py-px outline-none select-none",
        "[&:focus-visible>span]:outline-(length:--cal-focus-width) [&:focus-visible>span]:outline-palette-ring",
    );

export const bar = cn(
    "flex min-w-0 flex-1 items-center gap-0.5 rounded-(--cal-event-radius) bg-(--cal-event-bg) px-1.5 text-xs text-(--cal-event-fg)",
    "border-s-(length:--cal-event-stripe) border-(color:--cal-event-stripe-color)",
    "in-data-continues-before:rounded-s-none in-data-continues-before:ps-0.5 in-data-continues-after:rounded-e-none in-data-continues-after:pe-0.5",
);

export const barTitle = "min-w-0 flex-1 truncate";

export const arrow = "size-3 shrink-0 rtl:-scale-x-100";

export const allDayRow = cn(
    "relative flex border-b-(length:--cal-grid-width) [--calendar-row-inset:var(--axis)]",
    line,
);

export const allDayLabel =
    "w-(--axis) shrink-0 self-center pe-2 text-end text-xs text-palette-accent/85";

export const allDayCell = cn(
    "min-h-8 min-w-0 flex-1 border-s-(length:--cal-grid-width) p-1",
    line,
    focus,
);

export const scroller = "relative min-h-0 flex-1 overflow-auto";

export const body = "relative";

export const slotRow = "flex h-(--cal-slot-height)";

export const slotLabel =
    "w-(--axis) shrink-0 pe-2 text-end text-xs text-palette-accent/85";

export const slot = cn(
    "min-w-0 flex-1 border-s-(length:--cal-grid-width) border-t-(length:--cal-grid-width)",
    line,
    focus,
);

export const columns = "absolute inset-y-0 start-(--axis) end-0 flex";

export const column = "min-w-0 flex-1";

export const event = (state: TimeEventState) =>
    cn(
        `palette-${paletteOf(state.calendarId)}`,
        "cursor-default p-px outline-none select-none",
        "[&:focus-visible>span]:outline-(length:--cal-focus-width) [&:focus-visible>span]:outline-palette-ring",
    );

/** A part that goes on in the next (or comes from the previous) column has a square end. */
export const eventBox = cn(
    "flex size-full flex-col overflow-hidden rounded-(--cal-event-radius) bg-(--cal-event-bg) p-(--cal-event-padding) text-xs text-(--cal-event-fg)",
    "border-s-(length:--cal-event-stripe) border-(color:--cal-event-stripe-color)",
    "in-data-continues-before:rounded-t-none in-data-continues-after:rounded-b-none",
);

export const eventTitle = "truncate font-medium";

export const eventTime = "truncate opacity-80";
