// What the engine tells the app (`engine.subscribe`): taps on events, dates and "+N more" links,
// a confirmed selection, a drop, a native drop of foreign content, the day changing at midnight,
// and announcements (D13): data the app turns into its own live region's text (the library has
// none).
import type { SelectionRange } from "../features/types";
import type { DateRangeJson } from "../state/queries";
import type { CellPosition, GridPoint } from "./grid-point";
import type { PreviewTimes } from "./preview";

/** What an announcement is about (the app writes the text). */
export type Announcement =
    | {
          /** an event was grabbed by the keyboard (Space) */
          readonly kind: "grab";
          readonly occurrenceId: string;
      }
    | {
          /** a grabbed or dragged event's target changed: its times there, `null` when refused */
          readonly kind: "drag-over";
          readonly occurrenceId: string | null;
          readonly preview: PreviewTimes | null;
      }
    | {
          readonly kind: "drop";
          readonly occurrenceId: string | null;
          readonly preview: PreviewTimes;
      }
    | {
          /** a drag or a grab ended with nothing committed */
          readonly kind: "drag-cancel";
          readonly occurrenceId: string | null;
      }
    | {
          /** a keyboard selection grew or shrank (Shift + arrows): `null` when refused */
          readonly kind: "select-extend";
          readonly range: SelectionRange | null;
      }
    | {
          /**
           * a key showed another range (PageUp/PageDown, Shift with them, an arrow past the grid):
           * the days the view is about now (`current-range`) and the cell focused there. The
           * adapters reuse the cells' elements by position, so the focused element may be the one
           * focused before, with a new date: no `focus` event tells a screen reader (the date
           * picker's live region does)
           */
          readonly kind: "range";
          readonly range: DateRangeJson;
          readonly focused: CellPosition;
      };

/** An engine event. */
export type CalendarEngineEvent =
    | {
          /** a tap on an event (or Enter on a focused one) */
          readonly type: "event-click";
          readonly eventId: string;
          readonly occurrenceId: string;
          readonly keyboard: boolean;
      }
    | {
          /** a tap on a day or a time-grid slot */
          readonly type: "date-click";
          /** the day, `YYYY-MM-DD` */
          readonly date: string;
          readonly allDay: boolean;
          /** a slot's start: `HH:mm`, and the instant (RFC 3339, display zone) */
          readonly time?: string;
          readonly at?: string;
      }
    | {
          /** a tap on a day's "+N more" link: the app opens its popover */
          readonly type: "more-click";
          readonly date: string;
          readonly occurrenceIds: readonly string[];
      }
    | {
          /** a range was selected (`selection()`): by a pointer's release, or Enter */
          readonly type: "select";
          readonly range: SelectionRange;
          readonly keyboard: boolean;
      }
    | {
          /** an event was moved or resized by a drop (one command ran) */
          readonly type: "drop";
          readonly kind: "move" | "resize";
          readonly eventId: string;
          readonly occurrenceId: string;
          /** the command's result: its new times */
          readonly start: string;
          readonly end: string;
          readonly allDay: boolean;
          readonly keyboard: boolean;
      }
    | {
          /**
           * something from outside the calendar was dropped (`externalDrop()`): the event it added
           * (`eventId`), or, a native drop the app's `draft` made nothing of, the drop itself for the
           * app to read (`dataTransfer`)
           */
          readonly type: "external-drop";
          readonly eventId: string | null;
          readonly point: GridPoint;
          readonly types: readonly string[];
          readonly dataTransfer?: DataTransfer | undefined;
      }
    | {
          /** the day changed (the midnight refresh, D16): "today" moved */
          readonly type: "today-change";
          readonly today: string;
      }
    | {
          readonly type: "announce";
          readonly announcement: Announcement;
      };

/** An engine event's type. */
export type CalendarEngineEventType = CalendarEngineEvent["type"];

/**
 * The name of each engine event's callback in an adapter (`on` + it in React: `onEventClick`), so
 * every adapter names them alike. A feature's event (`select`, `drop`, `external-drop`) is typed
 * only with its feature (`FEATURE_KEYS[name].engineEvents`).
 */
export const ENGINE_EVENT_CALLBACKS = Object.freeze({
    "event-click": "EventClick",
    "date-click": "DateClick",
    "more-click": "MoreClick",
    select: "Select",
    drop: "EventDrop",
    "external-drop": "ExternalDrop",
    "today-change": "TodayChange",
    announce: "Announce",
} as const satisfies Record<CalendarEngineEventType, string>);

/** An engine event of a type. */
export type CalendarEngineEventOf<K extends CalendarEngineEventType> = Extract<
    CalendarEngineEvent,
    { readonly type: K }
>;
