import type { ListEventState } from "@fragiola/calendar-react";
import { cn } from "#/lib/cn";
import { paletteOf } from "../_kit/data";

// How list looks: one class string (or state function) per part, read by index.tsx. Colours come
// from the palette roles, sizes and shapes from the theme's --cal-* tokens.

export const root = cn(
    "palette-surface flex h-full min-h-0 flex-col gap-3 bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--cal-font) text-(length:--cal-size)",
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

export const list = cn(
    "palette-raised flex min-h-0 flex-1 flex-col gap-4 overflow-auto bg-palette-base p-4 shadow-(--cal-shadow)",
    "rounded-(--cal-radius) border-(length:--cal-grid-width) border-(color:--cal-line) [border-style:var(--cal-grid-style)]",
);

export const empty =
    "flex flex-1 flex-col items-center justify-center gap-2 text-sm text-palette-accent/85";

export const emptyIcon = "size-8";

export const day = "flex flex-col gap-1.5";

export const dayHeading = cn(
    "border-b-(length:--cal-grid-width) border-(color:--cal-line) pb-1 text-sm [border-style:var(--cal-grid-style)]",
    "font-(weight:--cal-header-weight) [text-transform:var(--cal-header-case)]",
);

export const events = "flex flex-col";

export const item = (state: ListEventState) =>
    cn(
        `palette-${paletteOf(state.calendarId)}`,
        "flex items-center gap-3 rounded-(--cal-event-radius) px-2 py-1.5 outline-none",
        "hover:bg-(--cal-hover-bg) focus-visible:outline-(length:--cal-focus-width) focus-visible:outline-palette-ring",
    );

/** The calendar's colour, as a dot. */
export const dot =
    "size-2.5 shrink-0 rounded-(--cal-today-radius) bg-palette-base";

export const time = "w-36 shrink-0 text-sm text-palette-accent/85 tabular-nums";

export const itemTitle = "truncate text-sm";
