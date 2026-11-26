// The typed registry of the engine's keys (D20, Dockable's `engine/verbs.ts`): what `engine.run`,
// `engine.get` and `engine.is` take and return. An engine action never has a dot, so it never reads
// as a command: commands change the calendar through the model; actions are what only the screen
// does (focus, a gesture, a measurement). The features' keys are here too (types cost no bytes),
// answered by their engine sides (`FEATURE_KEYS` says whose they are).
import type { EventAddPayload, NoPayload } from "../commands/types";
import type { AnyTypes, CalendarTypes } from "../document/calendar-types";
import type { SelectionRange } from "../features/types";
import type { DayGrid } from "../layout/day-grid";
import type { FocusPosition, GridPoint } from "./grid-point";
import type { DragPreview, PreviewSegments } from "./preview";

/** Where `focus` takes focus: a day, a slot (`time`), or an occurrence (in the cell of `date`). */
export type FocusTarget =
    | { date: string; time?: string }
    | { occurrenceId: string; date?: string };

/**
 * An event dragged in from outside (`external-drag-start`, `externalDrop()`): `event.add`'s
 * payload without its times, which the drop target gives; `duration` is minutes on the time grid
 * (default `defaultTimedDuration`) and days on a day grid (default `defaultAllDayDuration`).
 */
export type ExternalEventDraft<T extends CalendarTypes = AnyTypes> = Omit<
    EventAddPayload<T>,
    "start" | "end" | "allDay"
> & { duration?: { minutes?: number; days?: number } };

/** The current time's place (`get("now-position")`, `nowIndicator()`). */
export interface NowPosition {
    /** today, `YYYY-MM-DD`, in the display zone */
    readonly date: string;
    /** the wall-clock time, `HH:mm` */
    readonly time: string;
    /** where it is in a time-grid column, as a fraction from `slotMinTime` (0–1) */
    readonly top: number;
}

/** What `engine.run(action, payload)` does: each action's payload and result. */
export interface EngineRunMap<T extends CalendarTypes = AnyTypes> {
    /** moves the roving focus (and DOM focus) to a day, a slot or an event, navigating to it */
    focus: { payload: FocusTarget; result: { focused: FocusPosition } };
    /** ends the gesture under way (a drag, a selection, a grab) with nothing committed */
    "cancel-gesture": { payload: NoPayload; result: { cancelled: boolean } };
    /** measures the day cells again (`dayMaxEvents: "auto"`) */
    measure: { payload: NoPayload; result: { maxLanes: number | null } };
    /** starts an app-driven drag of an event from outside (`externalDrop()`) */
    "external-drag-start": {
        payload: { event: ExternalEventDraft<T> };
        result: Record<never, never>;
    };
    /** the outside drag's pointer moved, in client coordinates (`externalDrop()`) */
    "external-drag-move": {
        payload: { clientX: number; clientY: number };
        result: { point: GridPoint | null };
    };
    /** the outside drag ends: dropped (`event.add` where it is), or cancelled (`externalDrop()`) */
    "external-drag-end": {
        payload: { cancel?: boolean };
        result: { eventId: string | null };
    };
}

/** An engine action. */
export type EngineRunKey = keyof EngineRunMap;

/** What `engine.get(key, payload)` reads. */
export interface EngineGetMap {
    /** the focus position (`null` before anything was focused) */
    focused: { payload: NoPayload; result: FocusPosition | null };
    /** where the grid's one tab stop is: the focus position, else today or the first day */
    "tab-stop": { payload: NoPayload; result: FocusPosition | null };
    /** the day grid, with the measured lane limit of `dayMaxEvents: "auto"` applied */
    "day-grid": { payload: NoPayload; result: DayGrid | null };
    /** the lane limit measured for `dayMaxEvents: "auto"` (`null`: no limit) */
    "max-lanes": { payload: NoPayload; result: number | null };
    /** the root's reading direction */
    direction: { payload: NoPayload; result: "ltr" | "rtl" };
    /** the day or time under a client point (`null` outside the grids) */
    "point-at": {
        payload: { clientX: number; clientY: number };
        result: GridPoint | null;
    };
    /** the dragged occurrence where it would land (`null`: no drag, or a refused target) */
    "drag-preview": { payload: NoPayload; result: DragPreview | null };
    /** the resized occurrence's new times (`null`: no resize, or refused) */
    "resize-preview": { payload: NoPayload; result: DragPreview | null };
    /** the range a pointer or Shift + arrows is selecting (`null`: none, or refused) */
    "selection-preview": { payload: NoPayload; result: SelectionRange | null };
    /**
     * the range a highlight shows (the one being selected, else the selected one) laid out as the
     * layouts lay out an event: day-grid rows and time-grid columns (`null`: none)
     */
    "selection-segments": {
        payload: NoPayload;
        result: PreviewSegments | null;
    };
    /** the current time's place in the time grid (`null`: not in view) */
    "now-position": { payload: NoPayload; result: NowPosition | null };
}

/** A key of `engine.get`. */
export type EngineGetKey = keyof EngineGetMap;

/** What `engine.is(key, payload)` asks. */
export interface EngineIsMap {
    /** a pointer gesture or a keyboard grab is under way */
    "gesture-active": NoPayload;
    /** the occurrence is being dragged (pointer) */
    "event-dragging": { occurrenceId: string };
    /** the occurrence is grabbed by the keyboard */
    "event-grabbed": { occurrenceId: string };
    /** the occurrence is being resized */
    "event-resizing": { occurrenceId: string };
}

/** A key of `engine.is`. */
export type EngineIsKey = keyof EngineIsMap;
