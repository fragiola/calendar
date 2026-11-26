// The calendar engine (`architecture/core-and-adapters.md`, model vs engine): one view of a model
// on screen. It binds the root element through its owner document and its window (or an injected
// host, D16), owns the roving focus and the key chain (D12, with the features' hook points, D13),
// measures what it must (`dayMaxEvents: "auto"`, hit-testing, D11, D14), runs every pointer gesture
// through the features' press hooks (Flow's gesture objects: the engine owns capture, the drag
// threshold, the touch long press and every way a gesture ends), refreshes "today" at midnight
// from the model's clock, and tells the app what happened (`subscribe`). It changes the calendar
// only by running the model's commands. Shaped like Flow's engine (fragiola/flow,
// packages/core/src/engine/create-flow-engine.ts) and Tree's, same author and licence.
import { fail, ok } from "../commands/define";
import type { CommandResult } from "../commands/types";
import type { AnyTypes, CalendarTypes } from "../document/calendar-types";
import type {
    FeatureEngine,
    FeatureEngineHost,
    FeatureGesture,
    FeatureModel,
    PressTarget,
} from "../features/engine-types";
import { type FeatureKeyKind, requiresFeature } from "../features/keys";
import { type ComposedFeatures, featuresOf } from "../features/registry";
import type {
    CalendarFeatures,
    EngineGetKeyOf,
    EngineIsKeyOf,
    EngineRunKeyOf,
    PartAttributes,
} from "../features/types";
import type { DayGrid } from "../layout/day-grid";
import type { Occurrence } from "../layout/occurrence";
import type { TimeGrid } from "../layout/time-grid";
import type { CalendarModel } from "../model/calendar-model";
import { clockOf } from "../model/model-clock";
import type { QueryArgs } from "../state/queries";
import { fromEpochDay } from "../time/epoch-day";
import { formatPlainDate } from "../time/format-plain-date";
import { resolveTimeZone } from "../time-zone/resolve-time-zone";
import { startOfDay } from "../time-zone/start-of-day";
import { todayOf } from "../view/today";
import type { CalendarEngineAdapter, PartName, ViewChange } from "./adapter";
import { type EngineHost, resolveHost } from "./engine-host";
import type { CalendarEngineEvent } from "./events";
import type { CellPosition, FocusPosition, GridPoint } from "./grid-point";
import {
    type Box,
    type GridGeometry,
    pointAt,
    type TimeAxis,
    timePoint,
} from "./hit-test";
import { type GridCells, keyTarget } from "./keyboard";
import { attributesOf } from "./part-attributes";
import {
    cellOfOccurrence,
    defaultTabStop,
    gridCellsOf,
    isShown,
    keyOfPosition,
    minutesOf,
    occurrenceOf,
    positionOfPart,
} from "./positions";
import { type PreviewTimes, previewSegments } from "./preview";
import {
    clearEventTouchAction,
    writeEventTouchAction,
} from "./structural-style";
import type {
    EngineGetKey,
    EngineGetMap,
    EngineIsKey,
    EngineIsMap,
    EngineRunKey,
    EngineRunMap,
    FocusTarget,
} from "./verbs";

/** Options of {@link createCalendarEngine}. */
export interface CalendarEngineOptions {
    /**
     * the host's timers, frames, `ResizeObserver` and computed styles (D16); every member not
     * given is the root's window's, read when the root is attached
     */
    host?: Partial<EngineHost> | undefined;
    /** how long a touch is held before it drags or selects (D14), ms; default 500 */
    longPressDelay?: number | undefined;
    /** the pixels a mouse or pen press moves before a drag starts (D14); default 5 */
    dragThreshold?: number | undefined;
    /**
     * the time grid's autoscroll while a gesture nears its scroller's edges: the edge's size and the
     * most pixels per frame; `false` turns it off; default `{ edge: 40, speed: 12 }`
     */
    autoScroll?: { edge?: number; speed?: number } | false | undefined;
}

/**
 * One calendar view on screen. Every member is one verb, as on the model, and bound (D20): `run` a
 * screen action, `can` / `check` it, `get` a fact of the screen, `is` a yes/no question;
 * `subscribe` listens to what happens on screen (taps, selections, drops, announcements); `destroy`
 * releases it. `adapter` is what only an adapter calls.
 */
export interface CalendarEngine<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = CalendarFeatures,
> {
    run<K extends EngineRunKeyOf<F, EngineRunKey>>(
        action: K,
        ...payload: QueryArgs<EngineRunMap<T>[K]["payload"]>
    ): CommandResult<EngineRunMap<T>[K]["result"]>;
    can<K extends EngineRunKeyOf<F, EngineRunKey>>(
        action: K,
        ...payload: QueryArgs<EngineRunMap<T>[K]["payload"]>
    ): boolean;
    check<K extends EngineRunKeyOf<F, EngineRunKey>>(
        action: K,
        ...payload: QueryArgs<EngineRunMap<T>[K]["payload"]>
    ): CommandResult<EngineRunMap<T>[K]["result"]>;
    get<K extends EngineGetKeyOf<F, EngineGetKey>>(
        key: K,
        ...payload: QueryArgs<EngineGetMap[K]["payload"]>
    ): EngineGetMap[K]["result"];
    is<K extends EngineIsKeyOf<F, EngineIsKey>>(
        key: K,
        ...payload: QueryArgs<EngineIsMap[K]>
    ): boolean;
    /** listens to what happens on screen; returns its remover */
    subscribe(listener: (event: CalendarEngineEvent) => void): () => void;
    /** releases every listener, timer and element; no action runs afterwards */
    destroy(): void;
    /** what only an adapter calls */
    readonly adapter: CalendarEngineAdapter;
}

type ActionHandler = (
    payload: Readonly<Record<string, unknown>>,
    dryRun: boolean,
) => CommandResult<unknown>;

/** A registered element and what it is. */
interface Registration {
    readonly part: PartName;
    readonly payload: Readonly<Record<string, unknown>>;
    readonly element: HTMLElement;
}

/** A pointer press under way. */
interface Press {
    readonly pointerId: number;
    readonly startX: number;
    readonly startY: number;
    readonly target: PressTarget;
    readonly touch: boolean;
    /** a touch on a focused event drags like a mouse (D14) */
    readonly immediate: boolean;
    gesture: FeatureGesture | undefined;
    activated: boolean;
    travel: number;
    last: PointerEvent;
    longPress: number | undefined;
    /** a touch held until its gesture started: its release is no tap */
    held: boolean;
}

/** How far (px) a press may move and still be a tap. */
const TAP_TOLERANCE = 3;
/** How far (px) a touch may move while held for a long press. */
const TOUCH_SLOP = 5;
/** The longest delay a window's timer takes. */
const MAX_DELAY = 2_147_483_647;

const FOCUSABLE: ReadonlySet<string> = new Set(["day", "slot", "event"]);
/** The app's own controls: inside the root, the grid's keys leave them alone. */
const INTERACTIVE =
    'button, input, textarea, select, a[href], [contenteditable="true"], [contenteditable=""]';
/** The parts that are buttons: the grid's keys leave them alone. */
const BUTTONS: ReadonlySet<string> = new Set([
    "more",
    "previous",
    "next",
    "today",
    "view-button",
]);

/** The registry key of a part's element. */
function keyOf(part: string, payload: Readonly<Record<string, unknown>>) {
    switch (part) {
        case "event":
            return `event ${String(payload.occurrenceId)} ${String(payload.date)}`;
        case "resize-handle":
            return `resize-handle ${String(payload.occurrenceId)} ${String(payload.edge)} ${String(payload.date)}`;
        case "slot":
            return `slot ${String(payload.date)} ${String(payload.time)}`;
        case "week":
        case "week-number":
            return `${part} ${String(payload.weekId)}`;
        case "slot-label":
            return `${part} ${String(payload.time)}`;
        default:
            return payload.date === undefined
                ? part
                : `${part} ${String(payload.date)}`;
    }
}

function boxOf(element: Element): Box {
    const rect = element.getBoundingClientRect();
    return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
    };
}

class Engine<T extends CalendarTypes, F extends CalendarFeatures> {
    readonly adapter: CalendarEngineAdapter;
    private readonly model: CalendarModel<T, F>;
    private readonly loose: FeatureModel;
    private readonly features: ComposedFeatures;
    private readonly now: () => number;
    private readonly options: CalendarEngineOptions;
    private readonly parts: readonly FeatureEngine[];
    private readonly sharedValues = new Map<string, unknown>();
    private readonly actions = new Map<string, ActionHandler>();
    private readonly getters = new Map<string, (payload: unknown) => unknown>();
    private readonly questions = new Map<
        string,
        (payload: unknown) => boolean
    >();
    private readonly registry = new Map<string, Registration>();
    private readonly byElement = new Map<HTMLElement, Registration>();
    private readonly viewListeners = new Set<(change: ViewChange) => void>();
    private readonly eventListeners = new Set<
        (event: CalendarEngineEvent) => void
    >();
    private readonly dragsEvents: boolean;
    /** the host each feature timer was set on */
    private readonly timerHosts = new Map<number, EngineHost>();
    private rootElement: HTMLElement | undefined;
    private removeRootListeners: (() => void) | undefined;
    private observer: InstanceType<
        NonNullable<EngineHost["ResizeObserver"]>
    > | null = null;
    private focusPosition: FocusPosition | null = null;
    private pendingFocus = false;
    private press: Press | undefined;
    private keyGesture: FeatureGesture | undefined;
    private geometry: GridGeometry | undefined;
    private maxLanes: number | null = null;
    private laneHeight: number | undefined;
    private midnight: number | undefined;
    private midnightHost: EngineHost | undefined;
    private today: number;
    private scrollFrame: { host: EngineHost; id: number } | undefined;
    private snapshot = 0;
    private destroyed = false;
    private readonly unsubscribeModel: () => void;

    constructor(model: CalendarModel<T, F>, options: CalendarEngineOptions) {
        this.model = model;
        this.loose = model as unknown as FeatureModel;
        this.features = featuresOf(model);
        this.now = clockOf(model);
        this.options = options;
        this.today = this.todayNow();
        this.adapter = Object.freeze(this.adapterOf());
        const kit = this.kit();
        this.parts = this.features.list.flatMap((feature) =>
            feature.engine ? [feature.engine(kit)] : [],
        );
        this.dragsEvents = this.parts.some((part) => part.dragsEvents === true);
        this.coreKeys();
        for (const part of this.parts) {
            this.merge("action", part.run ?? {}, this.actions as never);
            this.merge("get key", part.get ?? {}, this.getters as never);
            this.merge("is key", part.is ?? {}, this.questions as never);
        }
        this.unsubscribeModel = model.subscribe((event) => {
            if (event.before.settings !== event.after.settings) {
                this.scheduleMidnight();
                this.geometry = undefined;
            }
            if (this.keyGesture?.active?.() === false) {
                this.keyGesture = undefined;
                this.notify({ gesture: true });
            }
        });
        this.scheduleMidnight();
        this.run = this.run.bind(this);
        this.can = this.can.bind(this);
        this.check = this.check.bind(this);
        this.get = this.get.bind(this);
        this.is = this.is.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.destroy = this.destroy.bind(this);
    }

    private merge<V>(
        kind: string,
        entries: Readonly<Record<string, V>>,
        into: Map<string, V>,
    ): void {
        for (const [key, value] of Object.entries(entries)) {
            if (into.has(key)) {
                throw new TypeError(
                    `two features add the engine ${kind} "${key}"`,
                );
            }
            into.set(key, value);
        }
    }

    // ---------------------------------------------------------------------------------------------
    // the verbs
    // ---------------------------------------------------------------------------------------------

    private coreKeys(): void {
        this.actions.set("focus", (payload, dryRun) =>
            this.focusAction(payload as FocusTarget, dryRun),
        );
        this.actions.set("cancel-gesture", (_payload, dryRun) => {
            const under =
                this.press !== undefined || this.keyGesture !== undefined;
            if (!dryRun) this.cancelAll();
            return ok({ cancelled: under });
        });
        this.actions.set("measure", (_payload, dryRun) => {
            if (!dryRun) this.measureLanes();
            return ok({ maxLanes: this.maxLanes });
        });
        this.getters.set("focused", () => this.focusPosition);
        this.getters.set("tab-stop", () => this.tabStop());
        this.getters.set("day-grid", () => this.dayGrid());
        this.getters.set("max-lanes", () => this.maxLanes);
        this.getters.set("direction", () => this.direction());
        this.getters.set("point-at", (payload) => {
            const { clientX, clientY } = (payload ?? {}) as {
                clientX?: unknown;
                clientY?: unknown;
            };
            return typeof clientX === "number" && typeof clientY === "number"
                ? this.pointAt(clientX, clientY)
                : null;
        });
        this.questions.set(
            "gesture-active",
            () => this.press !== undefined || this.keyGesture !== undefined,
        );
    }

    private missing(kind: FeatureKeyKind, key: string): string | undefined {
        const owner = this.features.missing(kind, key);
        return owner === undefined ? undefined : requiresFeature(owner);
    }

    run(action: string, payload?: unknown): CommandResult<never> {
        return this.perform(action, payload, false) as CommandResult<never>;
    }

    can(action: string, payload?: unknown): boolean {
        return this.perform(action, payload, true).ok;
    }

    check(action: string, payload?: unknown): CommandResult<never> {
        return this.perform(action, payload, true) as CommandResult<never>;
    }

    private perform(
        action: string,
        payload: unknown,
        dryRun: boolean,
    ): CommandResult<unknown> {
        if (this.destroyed) {
            return fail("refused", "the engine was destroyed");
        }
        const handler = this.actions.get(action);
        if (!handler) {
            const missing = this.missing("engineRun", action);
            return missing
                ? fail("not_found", `"${action}" ${missing}`)
                : fail("unknown_command", `unknown engine action "${action}"`);
        }
        if (
            payload !== undefined &&
            (typeof payload !== "object" || payload === null)
        ) {
            return fail("invalid_payload", "must be an object", "");
        }
        return handler(
            (payload ?? {}) as Readonly<Record<string, unknown>>,
            dryRun,
        );
    }

    get(key: string, payload?: unknown): never {
        return this.getters.get(key)?.(payload ?? {}) as never;
    }

    is(key: string, payload?: unknown): boolean {
        return this.questions.get(key)?.(payload ?? {}) ?? false;
    }

    subscribe(listener: (event: CalendarEngineEvent) => void): () => void {
        const wrapper = (event: CalendarEngineEvent) => listener(event);
        this.eventListeners.add(wrapper);
        return () => {
            this.eventListeners.delete(wrapper);
        };
    }

    destroy(): void {
        if (this.destroyed) return;
        this.detachRoot();
        this.clearMidnight();
        for (const part of this.parts) part.destroy?.();
        this.unsubscribeModel();
        this.viewListeners.clear();
        this.eventListeners.clear();
        this.destroyed = true;
    }

    private emit(event: CalendarEngineEvent): void {
        for (const listener of [...this.eventListeners]) listener(event);
    }

    private notify(change: Partial<ViewChange>): void {
        if (this.destroyed) return;
        this.snapshot++;
        const full: ViewChange = {
            focus: change.focus === true,
            gesture: change.gesture === true,
            layout: change.layout === true,
        };
        for (const listener of [...this.viewListeners]) listener(full);
    }

    // ---------------------------------------------------------------------------------------------
    // what the engine reads of the model
    // ---------------------------------------------------------------------------------------------

    private settings() {
        return this.model.state.settings;
    }

    private timeZone(): string {
        return resolveTimeZone(this.settings().timeZone);
    }

    private todayNow(): number {
        return todayOf(this.model.state.settings, this.now);
    }

    private snap(): number {
        const settings = this.settings();
        return settings.snapDuration ?? settings.slotDuration;
    }

    private axis(): TimeAxis {
        const settings = this.settings();
        return {
            min: minutesOf(settings.slotMinTime, 0),
            max: minutesOf(settings.slotMaxTime, 1440),
            snap: this.snap(),
            timeZone: this.timeZone(),
        };
    }

    private dayGrid(): DayGrid | null {
        return this.maxLanes === null
            ? (this.model.get("day-grid") as DayGrid | null)
            : (this.model.get("day-grid", {
                  maxLanes: this.maxLanes,
              }) as DayGrid | null);
    }

    private timeGrid(): TimeGrid | null {
        return this.model.get("time-grid") as TimeGrid | null;
    }

    private direction(): "ltr" | "rtl" {
        const root = this.rootElement;
        const host = this.host();
        if (!root || !host) return "ltr";
        return host.getComputedStyle(root).direction === "rtl" ? "rtl" : "ltr";
    }

    private host(): EngineHost | undefined {
        return resolveHost(this.options.host, this.rootElement);
    }

    private gridCells(): GridCells {
        return gridCellsOf(this.erased(), this.direction() === "rtl");
    }

    private occurrence(occurrenceId: string): Occurrence | undefined {
        return occurrenceOf(this.erased(), occurrenceId);
    }

    /** The cell an occurrence starts in, in the current view. */
    private cellOf(occurrence: {
        readonly start: string;
        readonly allDay: boolean;
    }): CellPosition | null {
        return cellOfOccurrence(this.erased(), occurrence);
    }

    private erased(): CalendarModel {
        return this.model as unknown as CalendarModel;
    }

    /** The occurrences shown in a cell, in their order there (lane, then top). */
    private eventsIn(cell: CellPosition): string[] {
        if (cell.kind === "day") {
            for (const week of this.dayGrid()?.weeks ?? []) {
                const column = week.days.findIndex(
                    (day) => day.date === cell.date,
                );
                if (column < 0) continue;
                return week.segments
                    .filter(
                        (segment) =>
                            segment.startColumn <= column &&
                            column < segment.startColumn + segment.span,
                    )
                    .sort((a, b) => a.lane - b.lane)
                    .map((segment) => segment.occurrenceId);
            }
            return [];
        }
        const timeGrid = this.timeGrid();
        const column = timeGrid?.columns.find((one) => one.date === cell.date);
        const slot = timeGrid?.slots.find((one) => one.time === cell.time);
        if (!column || !slot) return [];
        const bottom = slot.top + slot.height;
        return column.segments
            .filter(
                (segment) =>
                    segment.top < bottom &&
                    (segment.height === 0
                        ? segment.top >= slot.top
                        : segment.top + segment.height > slot.top),
            )
            .sort((a, b) => a.top - b.top || a.column - b.column)
            .map((segment) => segment.occurrenceId);
    }

    // ---------------------------------------------------------------------------------------------
    // focus (D12)
    // ---------------------------------------------------------------------------------------------

    /** Whether a position is shown by the current view. */
    private shown(position: FocusPosition): boolean {
        return isShown(this.erased(), position);
    }

    private tabStop(): FocusPosition | null {
        if (this.focusPosition && this.shown(this.focusPosition)) {
            return this.focusPosition;
        }
        return defaultTabStop(this.erased(), this.todayNow());
    }

    /** The key of a position's element. */
    private keyOfPosition(position: FocusPosition): string {
        return keyOfPosition(position);
    }

    private elementOf(
        position: FocusPosition,
        loose: boolean,
    ): HTMLElement | undefined {
        const exact = this.registry.get(this.keyOfPosition(position));
        if (exact || !loose || position.kind !== "event") {
            return exact?.element;
        }
        // a segment over several days is registered with its first day in its row: the element
        // that starts last at or before the cell is the one the cell shows, else any of its own
        let best: Registration | undefined;
        let any: Registration | undefined;
        for (const registration of this.registry.values()) {
            if (
                registration.part !== "event" ||
                registration.payload.occurrenceId !== position.occurrenceId
            ) {
                continue;
            }
            any ??= registration;
            const date = String(registration.payload.date);
            if (
                date <= position.cell.date &&
                (!best || date > String(best.payload.date))
            ) {
                best = registration;
            }
        }
        return (best ?? any)?.element;
    }

    /** Moves the roving focus, and DOM focus once the position's element is registered. */
    private focusOn(position: FocusPosition): void {
        const before = this.focusPosition;
        this.focusPosition = position;
        // exact: a loose match could be an element the commit under way removes (a dropped
        // event's old place); the adapter's `committed()` resolves a pending focus loosely
        const element = this.elementOf(position, false);
        if (element) {
            this.pendingFocus = false;
            this.focusElement(element);
        } else {
            this.pendingFocus = true;
        }
        if (
            !before ||
            this.keyOfPosition(before) !== this.keyOfPosition(position)
        ) {
            this.notify({ focus: true });
        }
    }

    private focusElement(element: HTMLElement): void {
        for (const registration of this.byElement.values()) {
            if (
                FOCUSABLE.has(registration.part) &&
                registration.element !== element &&
                registration.element.tabIndex === 0 &&
                this.model.state.view.type !== "list"
            ) {
                registration.element.tabIndex = -1;
            }
        }
        element.tabIndex = 0;
        if (element.ownerDocument.activeElement !== element) {
            element.focus({ preventScroll: false });
        }
    }

    /** The focus position an element is, from its registration. */
    private positionOf(
        registration: Pick<Registration, "part" | "payload">,
    ): FocusPosition | null {
        return positionOfPart(
            this.erased(),
            registration.part,
            registration.payload,
        );
    }

    private focusAction(
        target: FocusTarget,
        dryRun: boolean,
    ): CommandResult<unknown> {
        let position: FocusPosition | null = null;
        if (
            "occurrenceId" in target &&
            typeof target.occurrenceId === "string"
        ) {
            const occurrence = this.occurrence(target.occurrenceId);
            const cell = occurrence ? this.cellOf(occurrence) : null;
            if (!occurrence || !cell) {
                return fail(
                    "not_found",
                    `no occurrence has the id "${target.occurrenceId}"`,
                    "/occurrenceId",
                );
            }
            const at =
                typeof target.date === "string"
                    ? cell.kind === "day"
                        ? { kind: "day" as const, date: target.date }
                        : { ...cell, date: target.date }
                    : cell;
            position = {
                kind: "event",
                occurrenceId: target.occurrenceId,
                cell: at,
            };
        } else if ("date" in target && typeof target.date === "string") {
            const time = (target as { time?: unknown }).time;
            position =
                typeof time === "string"
                    ? { kind: "slot", date: target.date, time }
                    : { kind: "day", date: target.date };
        }
        if (!position) {
            return fail(
                "invalid_payload",
                "give a date (and a time), or an occurrenceId",
                "",
            );
        }
        const date =
            position.kind === "event" ? position.cell.date : position.date;
        if (!this.shown(position)) {
            const navigated = dryRun
                ? this.model.check("view.go-to", { date })
                : this.model.run("view.go-to", { date });
            if (!navigated.ok) return navigated;
            if (!dryRun && !this.shown(position)) {
                return fail(
                    "refused",
                    `the view does not show "${this.keyOfPosition(position)}"`,
                );
            }
        }
        if (!dryRun) this.focusOn(position);
        return ok({ focused: position });
    }

    // ---------------------------------------------------------------------------------------------
    // keys (D12, D13)
    // ---------------------------------------------------------------------------------------------

    private keyDown(event: KeyboardEvent): void {
        if (this.destroyed || event.defaultPrevented) return;
        const registration = this.registrationOf(event.target);
        // a button's keys are its own (a navigation button's click); a "+N more" link's Enter is
        // its tap (its Space clicks it: `click`)
        // an app's own control inside a part (a button, a field) keeps its keys
        if (
            event.target !== registration?.element &&
            (event.target as Element | null)?.closest?.(INTERACTIVE) &&
            !(
                registration &&
                (event.target as Element).closest(INTERACTIVE) ===
                    registration.element
            )
        ) {
            return;
        }
        if (registration && BUTTONS.has(registration.part)) {
            if (
                registration.part === "more" &&
                this.moreKey(event, String(registration.payload.date))
            ) {
                event.preventDefault();
                event.stopPropagation();
            }
            return;
        }
        const fromElement = registration
            ? this.keptCell(this.positionOf(registration))
            : null;
        if (fromElement) this.focusPosition = fromElement;
        const position = fromElement ?? this.focusPosition;
        const taken = this.keyChain(event, position);
        if (taken) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    /** The key chain: a grab's keys, the features' keys, the core's, the features' later ones. */
    private keyChain(
        event: KeyboardEvent,
        position: FocusPosition | null,
    ): boolean {
        const grab = this.keyGesture;
        if (grab) {
            if (event.key === "Escape") {
                this.keyGesture = undefined;
                grab.cancel();
                this.notify({ gesture: true });
                return true;
            }
            const taken = grab.keydown?.(event) ?? false;
            if (grab.active?.() === false) {
                this.keyGesture = undefined;
                this.notify({ gesture: true });
            }
            if (taken) return true;
        }
        // while a pointer press is under way, its gesture is the only one
        for (const part of this.press ? [] : this.parts) {
            const result = part.keydown?.(event, position);
            if (result === true) return true;
            if (typeof result === "object") {
                this.keyGesture?.cancel();
                this.keyGesture = result;
                this.notify({ gesture: true });
                return true;
            }
        }
        if (position && this.coreKey(event, position)) return true;
        for (const part of this.parts) {
            if (part.laterKeydown?.(event, position) === true) return true;
        }
        return false;
    }

    /** The core's keys over cells and events (D12). */
    private coreKey(event: KeyboardEvent, position: FocusPosition): boolean {
        if (event.ctrlKey || event.altKey || event.metaKey) return false;
        if (position.kind === "event") {
            if (event.key === "Escape") {
                this.focusOn(position.cell);
                return true;
            }
            if (event.key === "Enter" || event.key === " ") {
                if (event.key === " ") return false;
                const occurrence = this.occurrence(position.occurrenceId);
                if (!occurrence) return false;
                this.emit({
                    type: "event-click",
                    eventId: occurrence.eventId,
                    occurrenceId: occurrence.occurrenceId,
                    keyboard: true,
                });
                return true;
            }
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                const list = this.eventsIn(position.cell);
                const at = list.indexOf(position.occurrenceId);
                const next = list[at + (event.key === "ArrowDown" ? 1 : -1)];
                if (at >= 0 && next !== undefined) {
                    this.focusOn({ ...position, occurrenceId: next });
                } else if (
                    at === list.length - 1 &&
                    event.key === "ArrowDown"
                ) {
                    // a day's "+N more" link is the last item of its events
                    this.focusMore(position.cell);
                }
                return true;
            }
            return false;
        }
        if ((event.key === "Enter" || event.key === "F2") && !event.shiftKey) {
            const [first] = this.eventsIn(position);
            if (first === undefined) return this.focusMore(position);
            this.focusOn({
                kind: "event",
                occurrenceId: first,
                cell: position,
            });
            return true;
        }
        const target = keyTarget(position, event, this.gridCells());
        if (!target) return false;
        if ("step" in target) {
            const column = target.column;
            const stepped = this.model.run(
                target.step > 0 ? "view.next" : "view.previous",
                {},
            );
            if (!stepped.ok) return true;
            const columns = this.gridCells().columns;
            const date = columns[Math.min(column, columns.length - 1)];
            if (date === undefined) return true;
            this.focusOn(
                target.cell.kind === "slot"
                    ? { kind: "slot", date, time: target.cell.time }
                    : { kind: "day", date },
            );
            return true;
        }
        if (target.navigate) {
            const navigated = this.model.run("view.go-to", {
                date: target.cell.date,
            });
            if (!navigated.ok) return true;
            if (!this.shown(target.cell)) {
                // focus stays in the grid: on the view's tab stop, never lost to the page
                const stop = this.tabStop();
                if (stop) this.focusOn(stop);
                return true;
            }
        }
        this.focusOn(target.cell);
        return true;
    }

    /**
     * The focus position of an element, keeping the cell the focus entered it from: a segment over
     * several days is one element, registered with its first day, and the keys move among the
     * events of the day the focus came from (D12).
     */
    private keptCell(position: FocusPosition | null): FocusPosition | null {
        const current = this.focusPosition;
        if (
            position?.kind === "event" &&
            current?.kind === "event" &&
            current.occurrenceId === position.occurrenceId &&
            this.eventsIn(current.cell).includes(position.occurrenceId)
        ) {
            return current;
        }
        return position;
    }

    /** Focuses a day's "+N more" link, when the day has one: whether it did. */
    private focusMore(cell: CellPosition): boolean {
        if (cell.kind !== "day") return false;
        const more = this.registry.get(keyOf("more", { date: cell.date }));
        if (!more) return false;
        more.element.focus({ preventScroll: false });
        return true;
    }

    /**
     * The keys of a "+N more" link, the last item of its day's events (D12): Enter is its tap
     * (Space clicks it: `click`), Up goes back to the day's last event, Escape to the day.
     */
    private moreKey(event: KeyboardEvent, date: string): boolean {
        if (event.ctrlKey || event.altKey || event.metaKey) return false;
        const cell: CellPosition = { kind: "day", date };
        switch (event.key) {
            case "Enter":
                this.moreClick(date);
                return true;
            case "Escape":
                this.focusOn(cell);
                return true;
            case "ArrowUp": {
                const last = this.eventsIn(cell).at(-1);
                this.focusOn(
                    last === undefined
                        ? cell
                        : { kind: "event", occurrenceId: last, cell },
                );
                return true;
            }
            case "ArrowDown":
                return true;
            default:
                return false;
        }
    }

    private focusIn(event: FocusEvent): void {
        const registration = this.registrationOf(event.target);
        if (!registration || !FOCUSABLE.has(registration.part)) return;
        if (registration.element !== event.target) return;
        const position = this.keptCell(this.positionOf(registration));
        if (!position) return;
        const before = this.focusPosition;
        this.focusPosition = position;
        this.pendingFocus = false;
        if (
            !before ||
            this.keyOfPosition(before) !== this.keyOfPosition(position)
        ) {
            this.notify({ focus: true });
        }
    }

    private focusOut(event: FocusEvent): void {
        const next = event.relatedTarget as Node | null;
        if (next && this.rootElement?.contains(next)) return;
        // a grab never outlives focus leaving the calendar
        if (this.keyGesture) {
            const grab = this.keyGesture;
            this.keyGesture = undefined;
            grab.cancel();
            this.notify({ gesture: true });
        }
    }

    // ---------------------------------------------------------------------------------------------
    // the root and its elements
    // ---------------------------------------------------------------------------------------------

    private registrationOf(
        target: EventTarget | null,
    ): Registration | undefined {
        const root = this.rootElement;
        let node = target as Element | null;
        while (node && node !== root) {
            const registration = this.byElement.get(node as HTMLElement);
            if (registration) return registration;
            node = node.parentElement;
        }
        return undefined;
    }

    private register(
        part: PartName,
        payload: Readonly<Record<string, unknown>>,
        element: HTMLElement | null,
    ): void {
        if (this.destroyed) return;
        const key = keyOf(part, payload);
        const known = this.registry.get(key);
        if (known && known.element !== element) {
            this.registry.delete(key);
            this.byElement.delete(known.element);
            this.observer?.unobserve(known.element);
            if (part === "event" && this.dragsEvents) {
                clearEventTouchAction(known.element);
            }
        }
        this.geometry = undefined;
        if (!element) return;
        const registration: Registration = { part, payload, element };
        this.registry.set(key, registration);
        this.byElement.set(element, registration);
        // written while a root is attached (an adapter may register its parts before the root)
        if (part === "event" && this.dragsEvents && this.rootElement) {
            writeEventTouchAction(element);
        }
        if (part === "day-events") this.observer?.observe(element);
        if (FOCUSABLE.has(part) && this.model.state.view.type !== "list") {
            const position = this.positionOf(registration);
            const stop = this.tabStop();
            element.tabIndex =
                position &&
                stop &&
                this.keyOfPosition(position) === this.keyOfPosition(stop)
                    ? 0
                    : -1;
        }
        if (
            this.pendingFocus &&
            this.focusPosition &&
            key === this.keyOfPosition(this.focusPosition)
        ) {
            this.pendingFocus = false;
            this.focusElement(element);
        }
    }

    private attachRoot(element: HTMLElement): void {
        if (this.destroyed || this.rootElement === element) return;
        this.detachRoot();
        this.rootElement = element;
        const doc = element.ownerDocument;
        const listeners: [EventTarget, string, EventListener, boolean?][] = [
            [
                element,
                "pointerdown",
                (event) => this.pointerDown(event as PointerEvent),
            ],
            [
                element,
                "pointermove",
                (event) => this.pointerMove(event as PointerEvent),
            ],
            [
                element,
                "pointerup",
                (event) => this.pointerUp(event as PointerEvent),
            ],
            [
                element,
                "pointercancel",
                (event) => this.pointerLost(event as PointerEvent),
            ],
            [
                element,
                "lostpointercapture",
                (event) => this.pointerLost(event as PointerEvent),
            ],
            [
                element,
                "keydown",
                (event) => this.keyDown(event as KeyboardEvent),
            ],
            [element, "focusin", (event) => this.focusIn(event as FocusEvent)],
            [element, "click", (event) => this.click(event as MouseEvent)],
            [
                element,
                "focusout",
                (event) => this.focusOut(event as FocusEvent),
            ],
            [element, "scroll", () => this.scrolled(), true],
            [
                element,
                "contextmenu",
                (event) => {
                    // a touch long press opens no menu while it drags or selects
                    if (this.press?.gesture) event.preventDefault();
                },
            ],
            [doc, "dragend", (event) => this.nativeDrag(event as DragEvent)],
            // a press without a gesture captures no pointer: its release outside the root is
            // heard here, or the press would stay open and keep the features' keys off
            [
                doc,
                "pointerup",
                (event) => this.pointerOutside(event as PointerEvent),
            ],
            [
                doc,
                "pointercancel",
                (event) => this.pointerOutside(event as PointerEvent),
            ],
            // the page or an outer container scrolled: the measured boxes moved under the press
            [doc, "scroll", (event) => this.scrolledOutside(event), true],
            [
                doc,
                "keydown",
                (event) => this.documentKey(event as KeyboardEvent),
                true,
            ],
        ];
        for (const type of ["dragenter", "dragover", "dragleave", "drop"]) {
            listeners.push([
                element,
                type,
                (event) => this.nativeDrag(event as DragEvent),
            ]);
        }
        for (const [target, type, listener, capture] of listeners) {
            target.addEventListener(type, listener, capture === true);
        }
        this.removeRootListeners = () => {
            for (const [target, type, listener, capture] of listeners) {
                target.removeEventListener(type, listener, capture === true);
            }
        };
        const host = this.host();
        const Observer = host?.ResizeObserver;
        if (Observer) {
            this.observer = new Observer(() => this.measureLanes());
            for (const registration of this.byElement.values()) {
                if (registration.part === "day-events") {
                    this.observer.observe(registration.element);
                }
            }
        }
        this.writeTouchActions(true);
        for (const part of this.parts) part.attached?.(element);
        this.scheduleMidnight();
    }

    /** Writes, or removes, the structural `touch-action` of every registered event (D18). */
    private writeTouchActions(on: boolean): void {
        if (!this.dragsEvents) return;
        for (const registration of this.byElement.values()) {
            if (registration.part !== "event") continue;
            if (on) writeEventTouchAction(registration.element);
            else clearEventTouchAction(registration.element);
        }
    }

    private detachRoot(): void {
        if (!this.rootElement) return;
        this.cancelAll();
        this.observer?.disconnect();
        this.observer = null;
        this.removeRootListeners?.();
        this.removeRootListeners = undefined;
        this.writeTouchActions(false);
        this.rootElement = undefined;
        this.geometry = undefined;
        for (const part of this.parts) part.detached?.();
        // the timers of the root's window stop with it (an injected host's go on)
        this.scheduleMidnight();
    }

    private cancelAll(): void {
        this.cancelPress();
        if (this.keyGesture) {
            const grab = this.keyGesture;
            this.keyGesture = undefined;
            grab.cancel();
            this.notify({ gesture: true });
        }
    }

    private documentKey(event: KeyboardEvent): void {
        if (event.key !== "Escape" || !this.press) return;
        this.cancelPress();
        event.preventDefault();
        event.stopPropagation();
    }

    private nativeDrag(event: DragEvent): void {
        if (this.destroyed) return;
        for (const part of this.parts) {
            if (part.nativeDrag?.(event) === true) {
                event.preventDefault();
                return;
            }
        }
    }

    // ---------------------------------------------------------------------------------------------
    // measurement and hit-testing (D11, D14)
    // ---------------------------------------------------------------------------------------------

    private measuredGeometry(): GridGeometry {
        if (this.geometry) return this.geometry;
        const days: { date: string; box: Box }[] = [];
        const columns: { date: string; box: Box }[] = [];
        for (const registration of this.byElement.values()) {
            if (registration.part === "day") {
                days.push({
                    date: String(registration.payload.date),
                    box: boxOf(registration.element),
                });
            } else if (registration.part === "column") {
                columns.push({
                    date: String(registration.payload.date),
                    box: boxOf(registration.element),
                });
            }
        }
        this.geometry = { days, columns };
        return this.geometry;
    }

    private pointAt(clientX: number, clientY: number): GridPoint | null {
        // boxes are cached for one press only: outside it the page may scroll or reflow freely
        if (!this.press) this.geometry = undefined;
        return pointAt(this.measuredGeometry(), clientX, clientY, this.axis());
    }

    private outsideRoot(target: EventTarget | null): boolean {
        const root = this.rootElement;
        return (
            root !== undefined &&
            !(
                target !== null &&
                "nodeType" in target &&
                root.contains(target as Node)
            )
        );
    }

    private pointerOutside(event: PointerEvent): void {
        const press = this.press;
        if (
            press &&
            press.pointerId === event.pointerId &&
            this.outsideRoot(event.target)
        ) {
            this.cancelPress();
        }
    }

    private scrolledOutside(event: Event): void {
        if (this.press && this.outsideRoot(event.target)) this.scrolled();
    }

    private scrolled(): void {
        this.geometry = undefined;
        const press = this.press;
        if (press?.activated) press.gesture?.move(press.last);
    }

    /** Measures the day cells for `dayMaxEvents: "auto"` (D11): the lanes that fit. */
    private measureLanes(): void {
        const before = this.maxLanes;
        if (this.settings().dayMaxEvents !== "auto") {
            this.maxLanes = null;
        } else {
            let available = Number.POSITIVE_INFINITY;
            const containers: HTMLElement[] = [];
            for (const registration of this.byElement.values()) {
                if (registration.part !== "day-events") continue;
                containers.push(registration.element);
                const height =
                    registration.element.getBoundingClientRect().height;
                if (height > 0) available = Math.min(available, height);
            }
            for (const registration of this.byElement.values()) {
                if (
                    registration.part === "event" &&
                    containers.some((container) =>
                        container.contains(registration.element),
                    )
                ) {
                    const height =
                        registration.element.getBoundingClientRect().height;
                    if (height > 0) {
                        this.laneHeight = height;
                        break;
                    }
                }
            }
            const lane = this.laneHeight;
            if (!lane || !Number.isFinite(available)) {
                this.maxLanes = null;
            } else {
                const fit = Math.floor(available / lane);
                const full = (
                    (this.model.get("day-grid") as DayGrid | null)?.weeks ?? []
                ).reduce((most, week) => Math.max(most, week.lanes), 0);
                // a lane is kept for the "+N more" link when some do not fit
                this.maxLanes = full <= fit ? null : Math.max(fit - 1, 0);
            }
        }
        if (this.maxLanes !== before) this.notify({ layout: true });
    }

    // ---------------------------------------------------------------------------------------------
    // the clock (D16)
    // ---------------------------------------------------------------------------------------------

    private clearMidnight(): void {
        if (this.midnight !== undefined) {
            this.midnightHost?.clearTimeout(this.midnight);
        }
        this.midnight = undefined;
        this.midnightHost = undefined;
    }

    /** Schedules the refresh at the display zone's next midnight, from the model's clock. */
    private scheduleMidnight(): void {
        this.clearMidnight();
        if (this.destroyed) return;
        const host = this.host();
        if (!host) return;
        const now = this.now();
        const today = this.todayNow();
        const next = startOfDay(fromEpochDay(today + 1), this.timeZone());
        const delay = Math.min(Math.max(next - now, 0) + 1, MAX_DELAY);
        this.midnightHost = host;
        this.midnight = host.setTimeout(() => {
            this.midnight = undefined;
            this.dayPassed();
            this.scheduleMidnight();
        }, delay);
    }

    private dayPassed(): void {
        const today = this.todayNow();
        if (today === this.today) return;
        this.today = today;
        this.emit({
            type: "today-change",
            today: formatPlainDate(fromEpochDay(today)),
        });
        this.notify({ layout: true });
    }

    // ---------------------------------------------------------------------------------------------
    // pointer gestures (D14)
    // ---------------------------------------------------------------------------------------------

    private pressTarget(event: PointerEvent): PressTarget {
        const point = this.pointAt(event.clientX, event.clientY);
        const element = event.target as Element | null;
        if (element?.closest?.("[data-calendar-no-gesture]")) {
            return { kind: "other", element: undefined, point };
        }
        const registration = this.registrationOf(event.target);
        if (!registration) return { kind: "other", element: undefined, point };
        const { part, payload } = registration;
        const base = {
            element: registration.element,
            point,
            date: typeof payload.date === "string" ? payload.date : undefined,
        };
        if (part === "event" || part === "resize-handle") {
            const occurrenceId = String(payload.occurrenceId);
            return {
                ...base,
                kind: part,
                occurrenceId,
                eventId: this.occurrence(occurrenceId)?.eventId,
                edge:
                    payload.edge === "start" || payload.edge === "end"
                        ? payload.edge
                        : undefined,
            };
        }
        if (part === "slot") {
            return { ...base, kind: "slot", time: String(payload.time) };
        }
        if (part === "day" || part === "column" || part === "more") {
            return { ...base, kind: part };
        }
        // a part inside a day or a column (its events' container, a label) presses as it
        const outer = this.registrationOf(registration.element.parentElement);
        if (outer && (outer.part === "day" || outer.part === "column")) {
            return {
                element: outer.element,
                point,
                date: String(outer.payload.date),
                kind: outer.part,
            };
        }
        return { kind: "other", element: undefined, point };
    }

    private capture(pointerId: number): void {
        try {
            this.rootElement?.setPointerCapture?.(pointerId);
        } catch {
            // a pointer no longer active cannot be captured: its events still bubble here
        }
    }

    private release(pointerId: number): void {
        try {
            if (this.rootElement?.hasPointerCapture?.(pointerId)) {
                this.rootElement.releasePointerCapture(pointerId);
            }
        } catch {
            // already released
        }
    }

    private pointerDown(event: PointerEvent): void {
        if (this.destroyed || event.isPrimary === false) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        // a press whose release was never heard gives way to the new one, nothing committed
        if (this.press) this.cancelPress();
        if (this.keyGesture) this.cancelAll();
        this.geometry = undefined;
        const target = this.pressTarget(event);
        if (target.kind === "other") return;
        let gesture: FeatureGesture | undefined;
        for (const part of this.parts) {
            gesture = part.pointerdown?.(event, target);
            if (gesture) break;
        }
        const touch = event.pointerType === "touch";
        const focused = this.focusPosition;
        const immediate =
            !touch ||
            (target.kind === "event" &&
                focused?.kind === "event" &&
                focused.occurrenceId === target.occurrenceId);
        const press: Press = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            target,
            touch,
            immediate,
            gesture,
            activated: false,
            travel: 0,
            last: event,
            longPress: undefined,
            held: false,
        };
        this.press = press;
        if (gesture) {
            // without a gesture the press keeps its own target: an app's click handlers still run
            this.capture(event.pointerId);
            if (!immediate) {
                const host = this.host();
                press.longPress = host?.setTimeout(() => {
                    press.longPress = undefined;
                    if (this.press === press && press.gesture) {
                        press.held = true;
                        this.activate(press);
                    }
                }, this.options.longPressDelay ?? 500);
            } else if ((gesture.threshold ?? this.dragThreshold()) === 0) {
                this.activate(press);
            }
        }
        // a press on a day or a slot selects no text; an event's keeps its default (focus)
        if (target.kind !== "event" && target.kind !== "resize-handle") {
            event.preventDefault();
        }
    }

    private dragThreshold(): number {
        return this.options.dragThreshold ?? 5;
    }

    private activate(press: Press): void {
        press.activated = true;
        this.geometry = undefined;
        press.gesture?.move(press.last);
        this.notify({ gesture: true });
    }

    private pointerMove(event: PointerEvent): void {
        if (this.destroyed) return;
        const press = this.press;
        if (!press || press.pointerId !== event.pointerId) return;
        if (event.pointerType === "mouse" && event.buttons === 0) {
            // a release the root never heard (outside the window): nothing is committed
            this.cancelPress();
            return;
        }
        press.travel = Math.max(
            press.travel,
            Math.hypot(
                event.clientX - press.startX,
                event.clientY - press.startY,
            ),
        );
        press.last = event;
        const gesture = press.gesture;
        if (!gesture) return;
        if (!press.activated) {
            if (!press.immediate) {
                if (press.travel > TOUCH_SLOP) {
                    // a touch that moves before its long press scrolls: no gesture
                    this.clearLongPress(press);
                    press.gesture = undefined;
                    gesture.cancel();
                }
                return;
            }
            if (press.travel > (gesture.threshold ?? this.dragThreshold())) {
                this.activate(press);
                this.autoScroll();
            }
            return;
        }
        gesture.move(event);
        this.autoScroll();
    }

    private clearLongPress(press: Press): void {
        if (press.longPress !== undefined) {
            this.host()?.clearTimeout(press.longPress);
            press.longPress = undefined;
        }
    }

    private pointerUp(event: PointerEvent): void {
        if (this.destroyed) return;
        const press = this.press;
        if (!press || press.pointerId !== event.pointerId) return;
        this.press = undefined;
        this.clearLongPress(press);
        this.stopAutoScroll();
        this.release(event.pointerId);
        const gesture = press.gesture;
        const active = press.activated && gesture?.active?.() === true;
        if (gesture) {
            if (press.activated) gesture.end(event);
            else gesture.cancel();
        }
        this.geometry = undefined;
        if (gesture) this.notify({ gesture: true });
        if (press.travel <= TAP_TOLERANCE && !active && !press.held) {
            this.tap(event, press.target);
        }
    }

    private tap(event: PointerEvent, target: PressTarget): void {
        for (const part of this.parts) {
            if (part.tap?.(event, target) === true) return;
        }
        // a tap on a day or a slot moves the roving focus there (its press kept the browser's)
        if (target.kind === "day" || target.kind === "slot") {
            const position = this.positionOf({
                part: target.kind,
                payload: { date: target.date, time: target.time },
            });
            if (position) this.focusOn(position);
        }
        if (
            (target.kind === "event" || target.kind === "resize-handle") &&
            target.occurrenceId !== undefined
        ) {
            if (target.eventId === undefined) return;
            this.emit({
                type: "event-click",
                eventId: target.eventId,
                occurrenceId: target.occurrenceId,
                keyboard: false,
            });
            return;
        }
        if (target.kind === "more" && target.date !== undefined) {
            this.moreClick(target.date);
            return;
        }
        if (target.kind === "day" && target.date !== undefined) {
            this.emit({ type: "date-click", date: target.date, allDay: true });
            return;
        }
        const point =
            target.kind === "slot" && target.date && target.time
                ? this.slotPoint(target.date, target.time)
                : target.point;
        if (point?.kind === "time") {
            this.emit({
                type: "date-click",
                date: point.date,
                allDay: false,
                time: point.time,
                at: point.at,
            });
        }
    }

    /**
     * A click with no pointer and no key behind it (`detail` 0: assistive technology activating a
     * "+N more" link) is its tap; a pointer's tap or Enter already told the app.
     */
    private click(event: MouseEvent): void {
        if (this.destroyed || event.detail !== 0) return;
        const registration = this.registrationOf(event.target);
        if (registration?.part === "more") {
            this.moreClick(String(registration.payload.date));
        }
    }

    /** A day's "+N more" link was pressed (a tap, Enter or Space): the app opens its popover. */
    private moreClick(date: string): void {
        const day = this.dayGrid()
            ?.weeks.flatMap((week) => week.days)
            .find((one) => one.date === date);
        this.emit({
            type: "more-click",
            date,
            occurrenceIds: day?.hiddenOccurrenceIds ?? [],
        });
    }

    private slotPoint(date: string, time: string): GridPoint | null {
        const minutes = minutesOf(time, -1);
        return minutes < 0 ? null : timePoint(date, minutes, this.timeZone());
    }

    private pointerLost(event: PointerEvent): void {
        if (this.press?.pointerId === event.pointerId) this.cancelPress();
    }

    /** Ends the press under way without committing (its gesture cancelled). */
    private cancelPress(): void {
        const press = this.press;
        if (!press) return;
        this.press = undefined;
        this.clearLongPress(press);
        this.stopAutoScroll();
        this.release(press.pointerId);
        press.gesture?.cancel();
        this.geometry = undefined;
        if (press.gesture) this.notify({ gesture: true });
    }

    // ---------------------------------------------------------------------------------------------
    // autoscroll (D14)
    // ---------------------------------------------------------------------------------------------

    private scroller(): HTMLElement | undefined {
        return this.registry.get("scroller")?.element;
    }

    /** The pixels the scroller moves this frame for the press's pointer (0: none). */
    private scrollStep(): number {
        const press = this.press;
        const option = this.options.autoScroll;
        if (
            !press?.activated ||
            option === false ||
            press.gesture?.autoScroll === false
        ) {
            return 0;
        }
        const scroller = this.scroller();
        if (!scroller) return 0;
        const box = boxOf(scroller);
        const edge = option?.edge ?? 40;
        const speed = option?.speed ?? 12;
        const y = press.last.clientY;
        if (y < box.top + edge) {
            return -Math.ceil(speed * Math.min(1, (box.top + edge - y) / edge));
        }
        if (y > box.bottom - edge) {
            return Math.ceil(
                speed * Math.min(1, (y - (box.bottom - edge)) / edge),
            );
        }
        return 0;
    }

    private autoScroll(): void {
        if (this.scrollFrame || this.scrollStep() === 0) return;
        const host = this.host();
        if (!host) return;
        const id = host.requestAnimationFrame(() => {
            this.scrollFrame = undefined;
            const step = this.scrollStep();
            const scroller = this.scroller();
            const press = this.press;
            if (step === 0 || !scroller || !press) return;
            const before = scroller.scrollTop;
            scroller.scrollTop = before + step;
            if (scroller.scrollTop === before) return;
            this.geometry = undefined;
            press.gesture?.move(press.last);
            this.autoScroll();
        });
        this.scrollFrame = { host, id };
    }

    private stopAutoScroll(): void {
        if (this.scrollFrame) {
            this.scrollFrame.host.cancelAnimationFrame(this.scrollFrame.id);
            this.scrollFrame = undefined;
        }
    }

    // ---------------------------------------------------------------------------------------------
    // attributes (D17)
    // ---------------------------------------------------------------------------------------------

    private attributes(
        part: PartName,
        payload: Readonly<Record<string, unknown>>,
    ): PartAttributes {
        return attributesOf(
            this.erased(),
            part,
            payload,
            { tabStop: () => this.tabStop(), focused: this.focusPosition },
            this.parts,
        );
    }

    // ---------------------------------------------------------------------------------------------
    // what adapters and features get
    // ---------------------------------------------------------------------------------------------

    private adapterOf(): CalendarEngineAdapter {
        return {
            model: this.model as unknown as CalendarModel,
            attachRoot: (element) => this.attachRoot(element),
            detachRoot: () => this.detachRoot(),
            register: (part, payload, element) =>
                this.register(
                    part,
                    payload as Readonly<Record<string, unknown>>,
                    element,
                ),
            attributes: (part, payload) =>
                this.attributes(
                    part,
                    payload as Readonly<Record<string, unknown>>,
                ),
            committed: () => {
                this.measureLanes();
                if (this.pendingFocus && this.focusPosition) {
                    const element = this.elementOf(this.focusPosition, true);
                    if (element) {
                        this.pendingFocus = false;
                        this.focusElement(element);
                    }
                }
            },
            subscribe: (listener) => {
                const wrapper = (change: ViewChange) => listener(change);
                this.viewListeners.add(wrapper);
                return () => {
                    this.viewListeners.delete(wrapper);
                };
            },
            getSnapshot: () => this.snapshot,
        };
    }

    private kit(): FeatureEngineHost {
        return {
            model: this.loose,
            shared: <V>(key: string, create: () => V): V => {
                if (!this.sharedValues.has(key)) {
                    this.sharedValues.set(key, create());
                }
                return this.sharedValues.get(key) as V;
            },
            root: () => this.rootElement,
            installed: (name) =>
                this.features.list.some((feature) => feature.name === name),
            settings: () => this.settings(),
            timeZone: () => this.timeZone(),
            snapDuration: () => this.snap(),
            direction: () => this.direction(),
            pointAt: (clientX, clientY) => this.pointAt(clientX, clientY),
            occurrence: (occurrenceId) => this.occurrence(occurrenceId),
            focused: () => this.focusPosition,
            focus: (position) => this.focusOn(position),
            keyTarget: (cell, event) =>
                keyTarget(cell, event, this.gridCells()),
            cellOf: (occurrence) => this.cellOf(occurrence),
            previewSegments: (times: PreviewTimes) =>
                previewSegments(
                    this.loose.state,
                    this.todayNow(),
                    times,
                    times.eventId === null
                        ? undefined
                        : (this.model.get("event-by", { id: times.eventId }) as
                              | never
                              | undefined),
                ),
            now: () => this.now(),
            setTimeout: (callback, ms) => {
                const host = this.host();
                if (!host) return undefined;
                const id = host.setTimeout(() => {
                    this.timerHosts.delete(id);
                    callback();
                }, ms);
                this.timerHosts.set(id, host);
                return id;
            },
            clearTimeout: (id) => {
                if (id === undefined) return;
                // the host that set it: a detached root's window still clears its own
                this.timerHosts.get(id)?.clearTimeout(id);
                this.timerHosts.delete(id);
            },
            changed: () => this.notify({ gesture: true }),
            emit: (event) => this.emit(event),
        };
    }
}

/**
 * Creates the engine of one calendar view on a model: attach its root with
 * `engine.adapter.attachRoot` (an adapter does). The model's features add their engine parts.
 */
export function createCalendarEngine<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = CalendarFeatures,
>(
    model: CalendarModel<T, F>,
    options: CalendarEngineOptions = {},
): CalendarEngine<T, F> {
    const engine = new Engine(model, options);
    return Object.freeze({
        run: engine.run,
        can: engine.can,
        check: engine.check,
        get: engine.get,
        is: engine.is,
        subscribe: engine.subscribe,
        destroy: engine.destroy,
        adapter: engine.adapter,
    }) as unknown as CalendarEngine<T, F>;
}
