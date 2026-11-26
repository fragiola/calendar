// A test adapter: renders a calendar view the way an adapter would (a root, the day grid's days with
// their events, the time grid's columns, slots and events, a scroller), registers every element with
// the engine, gives them a layout (client rectangles), and stubs pointer capture (jsdom has none).
// The engine runs on an injected host (manual timers and frames, a chosen `direction`) and the
// model on a clock the test moves: no global timer, no global fake timers.
//
// Geometry, in client pixels: a month's day cells are 100 × 100 from (0, 100), seven a row; a time
// grid's all-day cells are 100 × 50 at y 0 from x 50, its columns 100 wide from x 50 and y 100, one
// pixel a minute (so 09:00 is y 640); its scroller shows y 100–600. Right to left mirrors the columns.
import { vi } from "vitest";
import type { DragAndDropFeature } from "../../src/drag-and-drop/index";
import type { ExternalDropFeature } from "../../src/external-drop/index";
import type {
    AnyTypes,
    CalendarEngine,
    CalendarEngineEvent,
    CalendarEngineOptions,
    CalendarEventJson,
    CalendarFeatures,
    CalendarModel,
    CalendarSettingsJson,
    DayGrid,
    TimeGrid,
    ViewJson,
} from "../../src/index";
import { createCalendarEngine } from "../../src/index";
import type { NowIndicatorFeature } from "../../src/now-indicator/index";
import type { RecurrenceFeature } from "../../src/recurrence/index";
import type { ResizeFeature } from "../../src/resize/index";
import type { SelectionFeature } from "../../src/selection/index";
import { modelOf, NOW } from "../fixture";

/** Every feature with engine keys: the tests' engines are typed with all of them. */
type Interactive = readonly [
    SelectionFeature,
    DragAndDropFeature,
    ResizeFeature,
    ExternalDropFeature,
    NowIndicatorFeature,
    RecurrenceFeature,
];

/** A host whose timers and frames the test runs, with a clock the model reads. */
export class TestHost {
    clock = NOW;
    direction = "ltr";
    private nextId = 1;
    readonly timers = new Map<number, { at: number; callback: () => void }>();
    readonly frames = new Map<number, (time: number) => void>();

    readonly host = {
        setTimeout: (callback: () => void, ms: number) => {
            const id = this.nextId++;
            this.timers.set(id, { at: this.clock + ms, callback });
            return id;
        },
        clearTimeout: (id: number) => {
            this.timers.delete(id);
        },
        requestAnimationFrame: (callback: (time: number) => void) => {
            const id = this.nextId++;
            this.frames.set(id, callback);
            return id;
        },
        cancelAnimationFrame: (id: number) => {
            this.frames.delete(id);
        },
        getComputedStyle: () => ({ direction: this.direction }),
    };

    /** Moves the clock by `ms`, running every timer due on the way, in order. */
    advance(ms: number): void {
        const until = this.clock + ms;
        for (;;) {
            const due = [...this.timers.entries()]
                .filter(([, timer]) => timer.at <= until)
                .sort((a, b) => a[1].at - b[1].at)[0];
            if (!due) break;
            this.timers.delete(due[0]);
            this.clock = Math.max(this.clock, due[1].at);
            due[1].callback();
        }
        this.clock = until;
    }

    /** Runs the frames requested so far. */
    frame(): void {
        const due = [...this.frames.values()];
        this.frames.clear();
        for (const callback of due) callback(this.clock);
    }
}

export interface MountOptions<F extends CalendarFeatures> {
    events?: CalendarEventJson[];
    settings?: CalendarSettingsJson;
    view?: ViewJson;
    features?: F;
    engine?: CalendarEngineOptions;
    rtl?: boolean;
    /** the height of a day's events container (month), px; default 80 */
    dayEventsHeight?: number;
    /** the height of a day-grid event, px; default 20 */
    eventHeight?: number;
}

function box(left: number, top: number, width: number, height: number) {
    return {
        left,
        top,
        width,
        height,
        x: left,
        y: top,
        right: left + width,
        bottom: top + height,
        toJSON: () => ({}),
    } as DOMRect;
}

let unmounts: (() => void)[] = [];

/** Unmounts every calendar mounted since the last call (in `afterEach`). */
export function unmountAll(): void {
    for (const unmount of unmounts.reverse()) unmount();
    unmounts = [];
    document.body.innerHTML = "";
}

/** Mounts a calendar: a model on the test clock, its engine on the test host, rendered. */
export function mount<const F extends CalendarFeatures = readonly []>(
    options: MountOptions<F> = {},
) {
    const test = new TestHost();
    test.direction = options.rtl ? "rtl" : "ltr";
    const model = modelOf<F>(
        options.events ?? [],
        options.settings ?? {},
        options.view ? { view: options.view } : {},
        { features: options.features, now: () => test.clock },
    ) as unknown as CalendarModel<AnyTypes, Interactive>;
    const engine = createCalendarEngine(model, {
        host: test.host,
        ...options.engine,
    }) as unknown as CalendarEngine<AnyTypes, Interactive>;
    const root = document.createElement("div");
    root.getBoundingClientRect = () => box(0, 0, 800, 700);
    const captured = new Set<number>();
    root.setPointerCapture = vi.fn((id: number) => {
        captured.add(id);
    });
    root.hasPointerCapture = vi.fn((id: number) => captured.has(id));
    root.releasePointerCapture = vi.fn((id: number) => {
        captured.delete(id);
    });
    document.body.append(root);
    engine.adapter.attachRoot(root);
    const elements = new Map<string, HTMLElement>();
    const registered = new Map<
        string,
        { part: string; payload: Record<string, unknown> }
    >();
    const events: CalendarEngineEvent[] = [];
    engine.subscribe((event) => events.push(event));
    const rtl = options.rtl === true;
    const scroller = document.createElement("div");
    let scrollTop = 0;
    Object.defineProperty(scroller, "scrollTop", {
        get: () => scrollTop,
        set: (value: number) => {
            scrollTop = Math.max(0, Math.min(value, 1000));
        },
    });
    scroller.getBoundingClientRect = () => box(0, 100, 800, 500);
    root.append(scroller);

    const columnLeft = (index: number, count: number) =>
        rtl ? 50 + (count - 1 - index) * 100 : 50 + index * 100;

    /** Creates or reuses an element, placed by `layout`, registered as `part`. */
    const use = (
        key: string,
        part: string,
        payload: Record<string, unknown>,
        parent: HTMLElement,
        layout: () => DOMRect,
        seen: Set<string>,
    ) => {
        seen.add(key);
        let element = elements.get(key);
        if (!element) {
            element = document.createElement("div");
            elements.set(key, element);
        }
        element.getBoundingClientRect = layout;
        element.dataset.key = key;
        if (element.parentElement !== parent) parent.append(element);
        registered.set(key, { part, payload });
        engine.adapter.register(part as never, payload as never, element);
        return element;
    };

    const render = () => {
        const seen = new Set<string>();
        const dayGrid = engine.get("day-grid") as DayGrid | null;
        const timeGrid = model.get("time-grid") as TimeGrid | null;
        const month = model.state.view.type === "month";
        dayGrid?.weeks.forEach((week, row) => {
            const count = week.days.length;
            week.days.forEach((day, column) => {
                const left = month
                    ? rtl
                        ? (count - 1 - column) * 100
                        : column * 100
                    : columnLeft(column, count);
                const top = month ? 100 + row * 100 : 0;
                const height = month ? 100 : 50;
                const cell = use(
                    `day ${day.date}`,
                    "day",
                    { date: day.date },
                    root,
                    () => box(left, top, 100, height),
                    seen,
                );
                use(
                    `day-events ${day.date}`,
                    "day-events",
                    { date: day.date },
                    cell,
                    () =>
                        box(left, top + 20, 100, options.dayEventsHeight ?? 80),
                    seen,
                );
            });
            for (const segment of week.segments) {
                const date = week.days[segment.startColumn]?.date ?? "";
                const container = elements.get(
                    `day-events ${date}`,
                ) as HTMLElement;
                const left = month
                    ? segment.startColumn * 100
                    : columnLeft(segment.startColumn, count);
                const top = (month ? 120 + row * 100 : 20) + segment.lane * 20;
                const element = use(
                    `event ${segment.occurrenceId} ${date}`,
                    "event",
                    { occurrenceId: segment.occurrenceId, date },
                    container,
                    () =>
                        box(
                            left,
                            top,
                            segment.span * 100,
                            options.eventHeight ?? 20,
                        ),
                    seen,
                );
                use(
                    `resize-handle ${segment.occurrenceId} end ${date}`,
                    "resize-handle",
                    { occurrenceId: segment.occurrenceId, date, edge: "end" },
                    element,
                    () => box(left + segment.span * 100 - 5, top, 5, 20),
                    seen,
                );
            }
        });
        if (timeGrid) {
            const count = timeGrid.columns.length;
            timeGrid.columns.forEach((column, index) => {
                const left = columnLeft(index, count);
                const columnElement = use(
                    `column ${column.date}`,
                    "column",
                    { date: column.date },
                    scroller,
                    () => box(left, 100 - scrollTop, 100, 1440),
                    seen,
                );
                for (const slot of timeGrid.slots) {
                    use(
                        `slot ${column.date} ${slot.time}`,
                        "slot",
                        { date: column.date, time: slot.time },
                        columnElement,
                        () =>
                            box(
                                left,
                                100 - scrollTop + slot.top * 1440,
                                100,
                                slot.height * 1440,
                            ),
                        seen,
                    );
                }
                for (const segment of column.segments) {
                    const element = use(
                        `event ${segment.occurrenceId} ${column.date}`,
                        "event",
                        {
                            occurrenceId: segment.occurrenceId,
                            date: column.date,
                        },
                        columnElement,
                        () =>
                            box(
                                left,
                                100 - scrollTop + segment.top * 1440,
                                100,
                                segment.height * 1440,
                            ),
                        seen,
                    );
                    use(
                        `resize-handle ${segment.occurrenceId} end ${column.date}`,
                        "resize-handle",
                        {
                            occurrenceId: segment.occurrenceId,
                            date: column.date,
                            edge: "end",
                        },
                        element,
                        () =>
                            box(
                                left,
                                100 -
                                    scrollTop +
                                    (segment.top + segment.height) * 1440 -
                                    4,
                                100,
                                4,
                            ),
                        seen,
                    );
                }
            });
        }
        if (timeGrid) {
            seen.add("scroller");
            engine.adapter.register("scroller", {}, scroller);
        }
        for (const [key, element] of [...elements]) {
            if (seen.has(key)) continue;
            const known = registered.get(key);
            if (known) {
                engine.adapter.register(
                    known.part as never,
                    known.payload as never,
                    null,
                );
            }
            registered.delete(key);
            elements.delete(key);
            element.remove();
        }
        engine.adapter.committed();
    };
    const unsubscribe = model.subscribe(() => render());
    const unsubscribeView = engine.adapter.subscribe((change) => {
        if (change.layout) render();
    });
    render();
    unmounts.push(() => {
        unsubscribe();
        unsubscribeView();
        engine.destroy();
    });

    const element = (key: string): HTMLElement => {
        const found = elements.get(key);
        if (!found) throw new Error(`no element ${key}`);
        return found;
    };
    const center = (key: string) => {
        const rect = element(key).getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };
    };
    let pointerId = 1;

    /** Dispatches a pointer event on an element (or the root), at a client point. */
    const pointer = (
        type: string,
        at: { x: number; y: number },
        on: Element = root,
        init: Partial<PointerEventInit> = {},
    ) => {
        const event = new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: at.x,
            clientY: at.y,
            pointerId,
            pointerType: "mouse",
            isPrimary: true,
            button: 0,
            buttons: type === "pointerup" ? 0 : 1,
            ...init,
        });
        on.dispatchEvent(event);
        return event;
    };

    /** A whole mouse drag: press on an element, moves through points, release at the last. */
    const drag = (
        from: Element,
        start: { x: number; y: number },
        points: { x: number; y: number }[],
        release = true,
    ) => {
        pointerId++;
        pointer("pointerdown", start, from);
        for (const point of points) pointer("pointermove", point, from);
        if (release) {
            pointer("pointerup", points[points.length - 1] ?? start, from);
        }
    };

    /** A key on the element holding DOM focus (or the root). */
    const key = (name: string, init: KeyboardEventInit = {}) => {
        const target = (document.activeElement as HTMLElement | null) ?? root;
        const event = new KeyboardEvent("keydown", {
            key: name,
            bubbles: true,
            cancelable: true,
            ...init,
        });
        (root.contains(target) ? target : root).dispatchEvent(event);
        return event;
    };

    return {
        test,
        model,
        engine,
        root,
        scroller,
        events,
        element,
        has: (key: string) => elements.has(key),
        center,
        pointer,
        drag,
        key,
        render,
        nextPointer: () => ++pointerId,
        /** a time-grid point: a column's date at an `HH:mm` (1 px a minute, scrolled) */
        timePoint: (date: string, time: string) => {
            const [h, m] = time.split(":").map(Number);
            const column = element(`column ${date}`).getBoundingClientRect();
            return {
                x: column.left + 50,
                y: column.top + (h ?? 0) * 60 + (m ?? 0) + 0.5,
            };
        },
        dayPoint: (date: string) => center(`day ${date}`),
    };
}

/** What `mount` returns. */
export type Mounted = ReturnType<typeof mount>;
