// A feature's part of an engine (`architecture/features.md`, "Engine hook points"): its engine
// keys, its press hook returning a gesture object (Flow's pattern, D14), its keys at named points
// of the engine's key chain (Data Grid's, D13), its attributes and its lifecycle. Each engine on a
// model gets its own; the engine lends its means through `FeatureEngineHost`, read at the call,
// never a snapshot. Features of one engine share state through `host.shared` (Tree's), never by
// importing each other.
import type {
    CommandListener,
    CommandName,
    CommandResult,
    RunOptions,
} from "../commands/types";
import type { CalendarSettings } from "../document/calendar-settings";
import type { ViewScope } from "../engine/adapter";
import type { CalendarEngineEvent } from "../engine/events";
import type {
    CellPosition,
    FocusPosition,
    GridPoint,
} from "../engine/grid-point";
import type { KeyTarget } from "../engine/keyboard";
import type { PreviewSegments, PreviewTimes } from "../engine/preview";
import type { Occurrence } from "../layout/occurrence";
import type { CalendarState } from "../state/calendar-state";
import type { ModelGetKey, ModelIsKey } from "../state/queries";

/** The model as a feature's engine side uses it: the verbs, typed loosely (any registry). */
export interface FeatureModel {
    readonly state: CalendarState;
    run(
        command: CommandName,
        payload: object,
        options?: RunOptions,
    ): CommandResult<unknown>;
    can(command: CommandName, payload: object, options?: RunOptions): boolean;
    check(
        command: CommandName,
        payload: object,
        options?: RunOptions,
    ): CommandResult<unknown>;
    get(key: ModelGetKey, payload?: object): unknown;
    is(key: ModelIsKey, payload?: object): boolean;
    subscribe(listener: CommandListener): () => void;
}

/**
 * What a press, a tap or a key is on, read from the registered elements: an event, its resize
 * handle, a day, a slot, a time-grid column, a "+N more" link, or something else (`other`: a part
 * with no gesture, or a control inside one marked `data-calendar-no-gesture`).
 */
export interface PressTarget {
    readonly kind:
        | "event"
        | "resize-handle"
        | "day"
        | "slot"
        | "column"
        | "more"
        | "other";
    readonly element: HTMLElement | undefined;
    /** the event's (an event, a resize handle) */
    readonly occurrenceId?: string | undefined;
    readonly eventId?: string | undefined;
    /** a resize handle's edge */
    readonly edge?: "start" | "end" | undefined;
    /** the day of the part (a day, a slot, a column, a "+N more" link, an event's cell) */
    readonly date?: string | undefined;
    /** a slot's start, `HH:mm` */
    readonly time?: string | undefined;
    /** the grid point under the pointer at the press (`null`: none, or a key) */
    readonly point: GridPoint | null;
}

/**
 * What the engine tells a gesture (D14): the pointer moved, was released, or the gesture ends. The
 * engine owns everything around it (pointer capture, the drag threshold and the touch long press,
 * Escape, `pointercancel`, a lost capture, a missed release, a detach), so no feature can leave a
 * gesture stuck.
 */
export interface FeatureGesture {
    /** the pointer moved, the gesture started (past its threshold), or the grid autoscrolled */
    move(event: PointerEvent): void;
    /** the pointer was released after the gesture started: it commits what it did */
    end(event: PointerEvent): void;
    /** the gesture ends without committing (Escape, `pointercancel`, a lost capture, a detach) */
    cancel(): void;
    /** whether it is doing something now (a drag that moved off its start): such a release is no tap */
    active?(): boolean;
    /**
     * the pixels a mouse or pen press moves before the gesture starts (default the engine's
     * `dragThreshold`); 0 starts it at the press (a selection's `selectMinDistance`)
     */
    readonly threshold?: number | undefined;
    /** the engine scrolls the time grid when the pointer nears its edges; default true */
    readonly autoScroll?: boolean | undefined;
    /**
     * a key while the gesture goes on without a press (a keyboard grab, D13): `true` takes it
     * (its default prevented); the gesture is over once `active()` answers false
     */
    keydown?(event: KeyboardEvent): boolean;
}

/**
 * What the engine lends the features of one view (Data Grid's `EngineKit`): the model, a shared
 * slot, its DOM questions, hit-testing, focus, the keyboard model, previews, the clock, timers and
 * notifications. Read at the call, never a snapshot.
 */
export interface FeatureEngineHost {
    readonly model: FeatureModel;
    /**
     * a value the features of this engine share, made by the first one that asks (the drag
     * session): features share state through it without importing each other
     */
    shared<V>(key: string, create: () => V): V;
    /** the root element, when attached */
    root(): HTMLElement | undefined;
    /** whether a feature of this name is installed on the model */
    installed(name: string): boolean;
    /** the settings in effect, and the display zone resolved */
    settings(): CalendarSettings;
    timeZone(): string;
    /** the snap step of the time grid, in minutes (`snapDuration`, else the slot) */
    snapDuration(): number;
    /** the reading direction of the root (D14) */
    direction(): "ltr" | "rtl";
    /** the grid point under a client point (`null` outside every grid) */
    pointAt(clientX: number, clientY: number): GridPoint | null;
    /** an occurrence by its id (one the view shows, else any) */
    occurrence(occurrenceId: string): Occurrence | undefined;
    /** the focus position (`null`: none yet) */
    focused(): FocusPosition | null;
    /** moves the roving focus (and DOM focus once its element is registered) */
    focus(position: FocusPosition): void;
    /** where a key takes focus from a cell (D12's keys, without navigating) */
    keyTarget(cell: CellPosition, event: KeyboardEvent): KeyTarget;
    /** the cell an occurrence starts in, in the current view (where focus follows it) */
    cellOf(occurrence: {
        readonly start: string;
        readonly allDay: boolean;
    }): CellPosition | null;
    /** a preview's segments in the current view, in the layout's shape */
    previewSegments(times: PreviewTimes): PreviewSegments;
    /** the model's clock (D16), epoch milliseconds */
    now(): number;
    /** a timer of the engine's host (`undefined` without one: no root attached, none injected) */
    setTimeout: (callback: () => void, ms: number) => number | undefined;
    clearTimeout: (id: number | undefined) => void;
    /**
     * the view changed: adapters re-render what the scopes reach (`preview`: only a preview moved,
     * no part's attributes; `selection`: the date cells' `data-selected`; `gesture`: any part's
     * state). Without a scope, every gesture scope (`gesture`, `preview`, `selection`)
     */
    changed(...scopes: ViewScope[]): void;
    /** tells the app something happened (`engine.subscribe`) */
    emit(event: CalendarEngineEvent): void;
}

/** A part's attributes as a feature adds to them, in place. */
export type MutablePartAttributes = Record<string, string | undefined>;

/**
 * A feature's part of one engine. The engine walks each hook in install order, the first that
 * takes the event ending the walk, and merges the keys into its verbs.
 */
export interface FeatureEngine {
    /** engine actions (`engine.run`), each with its dry run */
    readonly run?:
        | Readonly<
              Record<
                  string,
                  (payload: unknown, dryRun: boolean) => CommandResult<unknown>
              >
          >
        | undefined;
    /** engine reads (`engine.get`) */
    readonly get?:
        | Readonly<Record<string, (payload: unknown) => unknown>>
        | undefined;
    /** engine questions (`engine.is`) */
    readonly is?:
        | Readonly<Record<string, (payload: unknown) => boolean>>
        | undefined;
    /** whether it moves or resizes events: their elements get `touch-action: none` (D18) */
    readonly dragsEvents?: boolean | undefined;
    /** a primary press: a gesture takes it, `undefined` leaves it to the next feature */
    pointerdown?(
        event: PointerEvent,
        target: PressTarget,
    ): FeatureGesture | undefined;
    /** a press released where it was pressed (no gesture active): `true` takes it */
    tap?(event: PointerEvent, target: PressTarget): boolean | undefined;
    /**
     * a key on the grid before the core's keys (Space grabs, Shift + arrows select): `true` takes
     * it; a gesture takes it and goes on without a press (a grab): the engine gives it the next
     * keys first, and Escape, a press, focus leaving the root and a detach end it
     */
    keydown?(
        event: KeyboardEvent,
        target: FocusPosition | null,
    ): boolean | FeatureGesture | undefined;
    /** a key on the grid after the core's own keys did not take it */
    laterKeydown?(
        event: KeyboardEvent,
        target: FocusPosition | null,
    ): boolean | undefined;
    /**
     * a native drag over the root (`dragenter`, `dragover`, `dragleave`, `drop`) or its end anywhere in the document (`dragend`): `true` takes it
     * (its default prevented: a drop is allowed)
     */
    nativeDrag?(event: DragEvent): boolean | undefined;
    /** adds its state to a part's attributes (`data-dragging` on a dragged event) */
    attributes?(
        part: string,
        payload: Readonly<Record<string, unknown>>,
        into: MutablePartAttributes,
    ): void;
    /** the root element was attached (its window's timers are the host's now) */
    attached?(root: HTMLElement): void;
    /** the root goes away: what is under way ends */
    detached?(): void;
    /** the engine is destroyed */
    destroy?(): void;
}
