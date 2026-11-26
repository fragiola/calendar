import type { SegmentState, TimeEventState } from "@fragiola/calendar-vue";
import { cn } from "#/lib/cn";
import { paletteOf } from "../_kit/data";

// How drag-and-resize looks: one class string (or state function) per part, read by the SFCs. Colours come
// from the palette roles, sizes and shapes from the theme's --cal-* tokens. The time axis is 4rem
// wide: the header row and the all-day row start after it too (--calendar-row-inset, read by the
// row's decorations), and the layer of columns is laid over the slot rows after it.

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
    "grid grid-cols-[var(--axis)_repeat(7,minmax(0,1fr))]",
    "border-b-(length:--cal-grid-width)",
    line,
);

export const header = cn(
    "col-span-1 px-2 py-1.5 text-center text-xs text-palette-accent/85 first:col-start-2",
    "font-(weight:--cal-header-weight) [text-transform:var(--cal-header-case)]",
    "data-today:text-palette-contrast data-today:font-semibold",
);

export const allDayRow = cn(
    "grid grid-cols-[var(--axis)_repeat(7,minmax(0,1fr))] border-b-(length:--cal-grid-width)",
    line,
);

export const allDayLabel =
    "self-center pe-2 text-end text-xs text-palette-accent/85";

export const allDayCell = cn(
    "min-h-8 border-s-(length:--cal-grid-width) p-1 outline-none",
    line,
    "[--calendar-day-gap:calc(0.5rem+var(--cal-grid-width))]",
    "focus-visible:outline-(length:--cal-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-palette-ring",
);

export const segment = (state: SegmentState) =>
    cn(
        `palette-${paletteOf(state.calendarId)}`,
        "group/event flex cursor-default py-px outline-none select-none data-dragging:opacity-40 data-grabbed:opacity-60",
        "[&:focus-visible>span]:outline-(length:--cal-focus-width) [&:focus-visible>span]:outline-palette-ring",
    );

export const segmentLabel = cn(
    "flex min-w-0 flex-1 items-center truncate rounded-(--cal-event-radius) bg-(--cal-event-bg) px-1.5 text-xs text-(--cal-event-fg)",
    "border-s-(length:--cal-event-stripe) border-(color:--cal-event-stripe-color)",
);

export const scroller = "relative min-h-0 flex-1 overflow-auto";

/** The slot rows and the layer of columns over them share this box. */
export const body = "relative";

export const slotRow = "flex h-(--cal-slot-height)";

export const slotLabel =
    "relative w-(--axis) shrink-0 pe-2 text-end text-xs text-palette-accent/85";

/** The hour's label sits on the line above its row. */
export const slotTime = "relative -top-2";

export const slot = cn(
    "flex-1 border-s-(length:--cal-grid-width) border-t-(length:--cal-grid-width) outline-none",
    line,
    "data-business-hours:bg-palette-soft/40 hover:bg-(--cal-hover-bg)",
    "focus-visible:outline-(length:--cal-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-palette-ring",
);

export const columns = "absolute inset-y-0 start-(--axis) end-0 flex";

export const column = "flex-1";

export const event = (state: TimeEventState) =>
    cn(
        `palette-${paletteOf(state.calendarId)}`,
        "group/event cursor-default p-px outline-none select-none data-dragging:opacity-40 data-grabbed:opacity-60",
        "[&:focus-visible>span]:outline-(length:--cal-focus-width) [&:focus-visible>span]:outline-palette-ring",
    );

export const eventBox = cn(
    "flex size-full flex-col overflow-hidden rounded-(--cal-event-radius) bg-(--cal-event-bg) p-(--cal-event-padding) text-xs text-(--cal-event-fg)",
    "border-s-(length:--cal-event-stripe) border-(color:--cal-event-stripe-color) ring-1 ring-palette-base/10",
);

export const eventTitle = "truncate font-medium";

export const eventTime = "truncate opacity-80";

export const status = "sr-only";

/** A dragged event dims where it was; the preview shows where it lands. */
export const preview = cn(
    "palette-blue pointer-events-none z-10 rounded-(--cal-event-radius) bg-palette-base/25 p-1 ring-2 ring-palette-base ring-inset",
);

export const previewTime = "text-xs font-medium text-palette-accent";

export const rowPreview =
    "palette-blue pointer-events-none z-10 rounded-(--cal-event-radius) bg-palette-base/15 ring-2 ring-palette-base ring-inset";

/** A timed event's handles: a strip at each edge, shown on hover and focus. */
const handle =
    "absolute inset-x-1 h-1.5 cursor-ns-resize rounded-full bg-(--cal-event-stripe-color) opacity-0 group-hover/event:opacity-100";

export const handleStart = cn(handle, "top-0.5");

export const handleEnd = cn(handle, "bottom-0.5");

export const segmentHandle =
    "absolute inset-y-1 end-0.5 w-1.5 cursor-ew-resize rounded-full bg-(--cal-event-stripe-color) opacity-0 group-hover/event:opacity-100";

export const monthHeaders = "grid grid-cols-7";

export const monthWeek = "grid min-h-0 flex-1 grid-cols-7";

export const monthDay = cn(
    "flex min-h-0 flex-col gap-0.5 border-s-(length:--cal-grid-width) border-t-(length:--cal-grid-width) p-1 outline-none first:border-s-0",
    line,
    "data-outside:text-palette-accent/70 data-weekend:bg-(--cal-weekend-bg)",
    "focus-visible:outline-(length:--cal-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-palette-ring",
    "[--calendar-day-gap:calc(0.5rem+var(--cal-grid-width))]",
);

export const dayNumber = "text-xs";

export const dayEvents = "min-h-0";
