import type { ListEventState, SegmentState } from "@fragiola/calendar-angular";
import { cn } from "#/lib/cn";
import { paletteOf } from "../_kit/data";

// How month looks: one class string (or state function) per part, read by the components. Colours come
// from the palette roles, sizes and shapes from the theme's --cal-* tokens, so it works in every
// theme. The calendar's own geometry reads two custom properties set on the root: a lane's height
// (--calendar-lane-size) and the space between two days' event areas (--calendar-day-gap).

export const root = cn(
    "palette-surface flex h-full min-h-0 flex-col gap-3 bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--cal-font) text-(length:--cal-size)",
    "[--calendar-lane-size:var(--cal-lane-size)] [--calendar-day-gap:calc(0.5rem+var(--cal-grid-width))]",
);

export const toolbar = "flex items-center gap-2";

export const title = "me-auto text-lg font-semibold";

export const button = cn(
    "palette-raised h-8 rounded-(--cal-radius) border border-palette-line bg-palette-base px-3 text-sm",
    "hover:bg-palette-soft focus-visible:outline-(length:--cal-focus-width) focus-visible:outline-palette-ring",
    "data-disabled:opacity-50 data-pressed:bg-palette-soft",
);

export const iconButton = cn(
    button,
    "flex w-8 items-center justify-center px-0",
);

/** Chevrons point the reading direction's way. */
export const flip = "size-4 rtl:-scale-x-100";

export const grid = cn(
    "palette-raised flex min-h-0 flex-1 flex-col overflow-hidden bg-palette-base shadow-(--cal-shadow)",
    "rounded-(--cal-radius) border-(length:--cal-grid-width) border-(color:--cal-line) [border-style:var(--cal-grid-style)]",
);

export const headers = "grid grid-cols-7";

export const header = cn(
    "px-2 py-1.5 text-xs text-palette-accent/85",
    "font-(weight:--cal-header-weight) [text-transform:var(--cal-header-case)]",
);

export const week = "grid min-h-0 flex-1 grid-cols-7";

/** A day: its number, its events (they fill the room left: the engine measures it), "+N more". */
export const day = cn(
    "group/day flex min-h-0 flex-col gap-0.5 p-1 outline-none",
    "border-t-(length:--cal-grid-width) border-s-(length:--cal-grid-width) border-(color:--cal-line) [border-style:var(--cal-grid-style)]",
    "first:border-s-0 data-weekend:bg-(--cal-weekend-bg) data-outside:text-palette-accent/70",
    "focus-visible:outline-(length:--cal-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-palette-ring",
);

export const dayHeader = "flex items-center justify-between gap-1";

/** Today's number in the theme's marker (a circle, a square, ...). */
export const dayNumber = cn(
    "flex size-(--cal-today-size) shrink-0 items-center justify-center rounded-(--cal-today-radius) text-xs",
    "group-data-today/day:bg-(--cal-today-bg) group-data-today/day:font-semibold group-data-today/day:text-(--cal-today-fg)",
);

export const dayEvents = "min-h-0 flex-1";

/** The event takes its calendar's palette; the theme draws its box, its stripe and its density. */
export const segment = (state: SegmentState) =>
    cn(
        `palette-${paletteOf(state.calendarId)}`,
        "flex cursor-default py-px outline-none select-none",
        "[&:focus-visible>span]:outline-(length:--cal-focus-width) [&:focus-visible>span]:outline-palette-ring",
        state.continuesBefore ? "ps-0" : "ps-px",
    );

export const segmentLabel = cn(
    "flex min-w-0 flex-1 items-center truncate rounded-(--cal-event-radius) bg-(--cal-event-bg) px-1.5 text-xs text-(--cal-event-fg)",
    "border-s-(length:--cal-event-stripe) border-(color:--cal-event-stripe-color)",
);

export const more = cn(
    "truncate rounded-(--cal-event-radius) px-1 text-xs font-medium text-palette-accent/85",
    "hover:bg-palette-soft focus-visible:outline-(length:--cal-focus-width) focus-visible:outline-palette-ring",
);

export const agenda = cn(
    "palette-raised min-h-0 flex-1 overflow-auto bg-palette-base p-4 shadow-(--cal-shadow)",
    "rounded-(--cal-radius) border-(length:--cal-grid-width) border-(color:--cal-line) [border-style:var(--cal-grid-style)]",
);

export const agendaDay = "flex flex-col gap-2";

export const agendaHeading =
    "text-sm font-(weight:--cal-header-weight) [text-transform:var(--cal-header-case)]";

export const agendaList = "flex flex-col gap-1";

export const agendaItem = (state: ListEventState) =>
    cn(
        `palette-${paletteOf(state.calendarId)}`,
        "flex gap-3 rounded-(--cal-event-radius) bg-(--cal-event-bg) p-(--cal-event-padding) text-sm text-(--cal-event-fg)",
        "border-s-(length:--cal-event-stripe) border-(color:--cal-event-stripe-color)",
        "outline-none focus-visible:outline-(length:--cal-focus-width) focus-visible:outline-palette-ring",
    );

export const agendaTime = "w-32 shrink-0 tabular-nums opacity-80";
