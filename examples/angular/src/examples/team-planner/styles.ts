import type { SegmentState, TimeEventState } from "@fragiola/calendar-angular";
import { cn } from "#/lib/cn";
import { paletteOf } from "../_kit/data";

// How it looks: one class string (or state function) per part, read by the components. Colours come
// from the palette roles, sizes and shapes from the theme's --cal-* tokens. The time axis is 4rem
// wide: the header row and the all-day row start after it too (--calendar-row-inset, read by the
// row's decorations), and the layer of columns is laid over the slot rows after it.

export const root = cn(
    "palette-surface flex h-full min-h-0 gap-4 bg-palette-base p-4 text-palette-contrast",
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
    "grid grid-cols-[var(--axis)_repeat(var(--days),minmax(0,1fr))]",
    "border-b-(length:--cal-grid-width)",
    line,
);

export const header = cn(
    "col-span-1 px-2 py-1.5 text-center text-xs text-palette-accent/85 first:col-start-2",
    "font-(weight:--cal-header-weight) [text-transform:var(--cal-header-case)]",
    "data-today:text-palette-contrast data-today:font-semibold",
);

export const allDayRow = cn(
    "grid grid-cols-[var(--axis)_repeat(var(--days),minmax(0,1fr))] border-b-(length:--cal-grid-width)",
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
        "flex cursor-default py-px outline-none select-none",
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
        "cursor-default p-px outline-none select-none data-dragging:opacity-40 data-grabbed:opacity-60",
        "[&:focus-visible>span]:outline-(length:--cal-focus-width) [&:focus-visible>span]:outline-palette-ring",
    );

export const eventBox = cn(
    "flex size-full flex-col overflow-hidden rounded-(--cal-event-radius) bg-(--cal-event-bg) p-(--cal-event-padding) text-xs text-(--cal-event-fg)",
    "border-s-(length:--cal-event-stripe) border-(color:--cal-event-stripe-color) ring-1 ring-palette-base/10",
);

export const eventTitle = "truncate font-medium";

export const eventTime = "truncate opacity-80";

export const resizeHandle =
    "absolute inset-x-1 bottom-0 h-1.5 cursor-ns-resize rounded-full opacity-0 hover:bg-palette-base/60 hover:opacity-100";

/** Where a drag would put the event: the event's box, outlined. */
export const preview = cn(
    "pointer-events-none p-px",
    "[&]:rounded-(--cal-event-radius) [&]:outline-2 [&]:outline-dashed [&]:-outline-offset-2 [&]:outline-palette-ring",
);

export const sidebar =
    "flex w-64 shrink-0 flex-col gap-4 overflow-auto max-md:hidden";

export const main = "flex min-h-0 min-w-0 flex-1 flex-col gap-3";

export const panelSection = "flex flex-col gap-2";

export const panelHeading =
    "text-xs text-palette-accent/85 font-(weight:--cal-header-weight) [text-transform:var(--cal-header-case)]";

export const calendarList = "flex flex-col gap-1.5";

/** A person's row takes their calendar's palette: its checkbox and its swatch. */
export const calendarRow = (calendarId: string) =>
    cn(`palette-${paletteOf(calendarId)}`, "items-center");

export const swatch = "ms-auto size-2.5 rounded-full bg-palette-base";

export const primary = "palette-blue";

export const form = "contents";

export const scopeFooter = "flex-wrap";

/** The selected range: a wash over its slots. */
export const selection =
    "pointer-events-none rounded-(--cal-event-radius) bg-(--cal-selected-bg)";

export const businessHours = "pointer-events-none bg-palette-soft/50";

/** The now line, and its dot at the inline start (the theme's size: 0 for none). */
export const now = cn(
    "palette-danger pointer-events-none z-10 h-(--cal-now-width) bg-palette-base",
    "before:absolute before:-start-1 before:top-1/2 before:size-(--cal-now-dot) before:-translate-y-1/2 before:rounded-full before:bg-palette-base",
);

export const repeat = "me-1 inline size-3 align-[-1px]";
