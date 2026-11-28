// What only an adapter (React, Vue, Angular) calls on an engine (D20): the elements it renders, the
// attributes it spreads on them (D17: `data-calendar-part`, the model's `data-*`, the engine's
// roles, tab stop and gesture state) and the view changes it re-renders from. An app never needs
// it. The adapter renders and registers; the engine listens to the root's events itself (Pointer
// Events with capture, keys, focus, native drags) and decides.

import type { NoPayload } from "../commands/types";
import type { ViewType } from "../document/calendar-document";
import type { PartAttributes } from "../features/types";
import type { CalendarModel } from "../model/calendar-model";
import type { PartAttributeOptions } from "./part-attributes";

/** Each part the engine knows, with what names one of its elements. */
export interface PartPayloadMap {
    root: NoPayload;
    /** a month view's grid, or a time-grid view's all-day row container */
    "day-grid": NoPayload;
    /** a month's row (`DayGridWeek.id`) */
    week: { weekId: string };
    /** a time grid's all-day row: its day grid's one row (`DayGridWeek.id`) */
    "all-day-row": { weekId: string };
    /** a day of a day grid (a month day, an all-day cell) */
    day: { date: string };
    /** the events' container of a day (`dayMaxEvents: "auto"` measures it) */
    "day-events": { date: string };
    /** a day's "+N more" link */
    more: { date: string };
    "week-number": { weekId: string };
    "time-grid": NoPayload;
    /** the row of column headers (a time grid's days, a month's weekdays) */
    "column-headers": NoPayload;
    /** a time grid's row of slots at one time, a slot per day */
    "slot-row": { time: string };
    /** the positioned layer of a time grid's columns */
    columns: NoPayload;
    /** a time-grid column (a day): the positioned layer its timed events, previews and indicators are in */
    column: { date: string };
    /** a column's timed events (a list) */
    "column-events": { date: string };
    /** a time-grid slot */
    slot: { date: string; time: string };
    /** a slot row's label (its row header) */
    "slot-label": { time: string };
    /** the element that scrolls the time grid (autoscroll) */
    scroller: NoPayload;
    "column-header": { date: string };
    /**
     * an occurrence's element: a day-grid segment, a time-grid segment or a list item; `date` is
     * the day of the cell it starts in (a segment's first column, a column's date, a list day)
     */
    event: {
        occurrenceId: string;
        date: string;
        continuesBefore?: boolean;
        continuesAfter?: boolean;
    };
    /** an event's resize handle (`resize()`) */
    "resize-handle": {
        occurrenceId: string;
        date: string;
        edge: "start" | "end";
    };
    list: NoPayload;
    "list-day": { date: string };
    "now-indicator": NoPayload;
    "drag-preview": NoPayload;
    selection: NoPayload;
    "business-hours": { date: string };
    /** the button that runs `view.previous` */
    previous: NoPayload;
    /** the button that runs `view.next` */
    next: NoPayload;
    /** the button that runs `view.today` */
    today: NoPayload;
    /** a button that runs `view.set` (`aria-pressed` when it is the view shown) */
    "view-button": { type: ViewType; days?: number };
}

/** A part's name. */
export type PartName = keyof PartPayloadMap;

/**
 * A view change's scope: what it may change (Issue #24). A change names every scope it touches;
 * `engine.adapter.affects(change, part)` says whether a part's attributes may have changed.
 */
export type ViewScope =
    | "layout"
    | "focus"
    | "gesture"
    | "preview"
    | "selection";

/** What changed in the view, by scope, for an adapter to re-render only what depends on it. */
export interface ViewChange {
    /**
     * the roving focus moved: the focusable parts' `tabindex` and `data-focused` (`day`, `slot`,
     * `event`), `get("focused")`, `get("tab-stop")`
     */
    readonly focus: boolean;
    /**
     * a gesture started or ended: the features' state on any part (`data-dragging`,
     * `data-grabbed`, `data-resizing`), `is("gesture-active")`, `is("event-dragging")`, …, and the
     * previews
     */
    readonly gesture: boolean;
    /**
     * a gesture's preview moved (`get("drag-preview")`, `get("resize-preview")`): no part's
     * attributes change, only the preview's parts
     */
    readonly preview: boolean;
    /**
     * the selection a press is making changed: the date cells' `data-selected` (`day`, `slot`)
     * and `get("selection-preview")`, `get("selection-segments")`
     */
    readonly selection: boolean;
    /**
     * a measurement changed what the layout shows (`dayMaxEvents: "auto"`: `get("day-grid")`), the
     * clock moved ("today", `get("now-position")`) or the host's zone changed: every part
     */
    readonly layout: boolean;
}

/** What only an adapter calls on an engine. */
export interface CalendarEngineAdapter {
    /** the model this engine shows */
    readonly model: CalendarModel;
    /**
     * attaches the root element: the engine listens to its events (pointers, keys, focus, native
     * drags) and reads its window (timers, `direction`); another one replaces it
     */
    attachRoot(element: HTMLElement): void;
    /** detaches the root, cancelling a gesture under way */
    detachRoot(): void;
    /**
     * registers (or, with `null`, unregisters) a part's element: the engine measures it, hit-tests
     * on it, focuses it (`tabIndex`) and writes its structural style (D18)
     */
    register<P extends PartName>(
        part: P,
        payload: PartPayloadMap[P],
        element: HTMLElement | null,
    ): void;
    /**
     * a part's attributes: `data-calendar-part` (an `event` is named where it shows: `segment`,
     * `time-event` or `list-event`), the model's (`data-date`, `data-today`, …), the engine's
     * (`role`, `tabindex`, `data-focused`) and the features' (`data-selected`, `data-dragging`,
     * `data-grabbed`, `data-resizing`); before an engine exists, `partAttributes` gives the same.
     * `options` say how the app renders the parts (`weekNumberColumn`: a month's week numbers).
     * Memoised per part: the same record (by identity) while the part's attributes are the same,
     * read again only when what it reads changed (the model's state, today, the focus, the
     * features' gesture state)
     */
    attributes<P extends PartName>(
        part: P,
        payload: PartPayloadMap[P],
        options?: PartAttributeOptions,
    ): PartAttributes;
    /**
     * the adapter committed a render: the engine measures (`dayMaxEvents: "auto"`) and gives focus
     * to an element it was waiting for (an event moved by the keyboard)
     */
    committed(): void;
    /**
     * calls `listener` when the view changes (not the model: adapters subscribe to it), once per
     * input event (a pointer move, a key) with every scope it touched; returns its remover
     */
    subscribe(listener: (change: ViewChange) => void): () => void;
    /** a number that changes whenever the view changes */
    getSnapshot(): number;
    /**
     * whether a view change may change what a part shows: its attributes (`attributes` gives the
     * same record, by identity, while they are the same) or, for a decoration, its preview.
     * `layout` and `gesture` reach every part, `focus` the focusable ones (`day`, `slot`,
     * `event`), `selection` the date cells and the `selection` decoration, `preview` only the
     * `drag-preview` decoration
     */
    affects(change: ViewChange, part: PartName): boolean;
}
