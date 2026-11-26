import {
    ApplicationRef,
    afterEveryRender,
    afterNextRender,
    computed,
    Directive,
    ErrorHandler,
    effect,
    inject,
    input,
    output,
    type Signal,
    signal,
    untracked,
} from "@angular/core";
import {
    type AnyTypes,
    type CalendarEngine,
    type CalendarEngineEvent,
    type CalendarEngineEventOf,
    type CalendarEngineOptions,
    type CalendarEventJson,
    type CalendarEventOf,
    type CalendarFeatures,
    type CalendarInfoJson,
    type CalendarModel,
    type CalendarSettingsJson,
    type CalendarTypes,
    type CommandEvent,
    type CreateId,
    createCalendarEngine,
    createCalendarModel,
    type DateInput,
    type PartAttributeOptions,
    partAttributes,
    type ViewType,
} from "@fragiola/calendar";
import {
    type AnyCalendarEngine,
    type AnyCalendarModel,
    bindAttributes,
    booleanInput,
    CALENDAR_CONTEXT,
    type CalendarContext,
    calendarValue,
    eraseModel,
    injectHost,
    onDestroy,
    optionalNumber,
    sameValue,
    typedEngine,
} from "@fragiola/calendar-angular/internal";
import {
    type CalendarRef,
    setCalendarRef,
} from "../inject/create-calendar-ref";
import { createEngineFacade } from "../utils/engine-facade";

export interface RootState {
    /** the view shown (`data-view`) */
    view: ViewType;
    /** a pointer gesture or a keyboard grab is under way */
    gestureActive: boolean;
}

/** A view as the root's `viewChangeDetails` gives it. */
export interface RootView {
    type: ViewType;
    /** `days` views: how many days */
    days?: number | undefined;
}

/** The `meta` of the commands that bring the model to the controlled inputs. */
const CONTROLLED = Object.freeze({ source: "controlled" });

/** A list of features by their names, in order: an equal new list (`[features]="[selection()]"`) is the same. */
function featureNames(features: CalendarFeatures | undefined): string {
    return (features ?? []).map((feature) => feature.name).join(",");
}

/** What the controlled inputs were last sent as (a value equal to it sends nothing). */
interface Sent {
    model: unknown;
    events: unknown;
    settings: string;
    view: string;
    date: string;
}

/** The controlled inputs, read together. */
interface Controlled {
    events: readonly unknown[] | undefined;
    settings: CalendarSettingsJson | undefined;
    view: ViewType | undefined;
    days: number | undefined;
    date: DateInput | undefined;
}

function sentOf(model: unknown, controlled: Controlled): Sent {
    return {
        model,
        events: controlled.events,
        settings: JSON.stringify(controlled.settings ?? null),
        view: `${controlled.view}/${controlled.days}`,
        date: JSON.stringify(controlled.date ?? null),
    };
}

/**
 * The calendar (`data-calendar-part="root"`), on the element it renders in:
 * `<div [calendarRoot]="model">` (or `<div calendarRoot [defaultEvents]="events">`, a model it
 * creates). It owns the engine of its model, attaches it to its element (the engine listens to
 * it: pointers, keys, focus, native drags) and provides the calendar to the parts inside. A change
 * of the calendar is on screen before the next task (zoneless Angular would render it in a later
 * one). `#calendar="calendarRoot"` gives its `model()`, its `engine` and its `state()`.
 */
@Directive({
    selector: "[calendarRoot]",
    exportAs: "calendarRoot",
    providers: [
        {
            provide: CALENDAR_CONTEXT,
            useFactory: () => inject(CalendarRootDirective).context,
        },
    ],
})
export class CalendarRootDirective<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
> {
    /**
     * the calendar model. Its middleware (`model.use`) sees every command the calendar runs, and
     * its listeners (`model.subscribe`) every change. Another model makes another engine. Give it,
     * or let the root create one from the inputs below (read once, when it creates it, but the
     * controlled ones)
     */
    readonly calendarRoot = input<CalendarModel<T, F> | "" | undefined>(
        undefined,
    );
    /**
     * controlled events (`[(events)]`): a new list replaces the model's events (`event.set-all`:
     * give each its id); `eventsChange` reports every other change. A list the root reported back
     * (the model's own) runs nothing
     */
    readonly events = input<
        readonly (CalendarEventJson<T> | CalendarEventOf<T>)[] | undefined
    >(undefined);
    /** the events of the model the root creates (read once, when it creates it) */
    readonly defaultEvents = input<readonly CalendarEventJson<T>[] | undefined>(
        undefined,
    );
    /** the calendars (categories) of the model the root creates (read once) */
    readonly defaultCalendars = input<
        readonly CalendarInfoJson<T>[] | undefined
    >(undefined);
    /**
     * the settings: the model the root creates starts with them, and a change is applied
     * (`settings.set`, the changed value as a whole patch)
     */
    readonly settings = input<CalendarSettingsJson | undefined>(undefined);
    /** controlled view type (`[(view)]`, `view.set`), with `days` for a `days` view */
    readonly view = input<ViewType | undefined>(undefined);
    /** the view type of the model the root creates (read once) */
    readonly defaultView = input<ViewType | undefined>(undefined);
    /** a `days` view's number of days (with `view` or `defaultView`) */
    readonly days = input(undefined, { transform: optionalNumber });
    /** controlled date (`[(date)]`): a new value goes to it (`view.go-to`) */
    readonly date = input<DateInput | undefined>(undefined);
    /** the date the model the root creates opens on (read once); default today */
    readonly defaultDate = input<DateInput | undefined>(undefined);
    /**
     * the opt-in features of the model the root creates (read once): `[selection(), dragAndDrop()]`,
     * each from its entry (`@fragiola/calendar-angular/selection`). A model has its own
     */
    readonly features = input<F | undefined>(undefined);
    /** the clock of the model the root creates (read once; D16) */
    readonly now = input<(() => number) | undefined>(undefined);
    /** the id generator of the model the root creates (read once) */
    readonly createId = input<CreateId | undefined>(undefined);
    /** access to the model and the engine from outside the root (`createCalendarRef`, `injectCalendarRef`) */
    readonly calendarRef = input<CalendarRef<T, F> | undefined>(undefined);
    /**
     * a month's rows render a `[calendarWeekNumber]` before their days: the grid counts that
     * column (`aria-colcount`, `aria-colindex` on the week numbers, days and headers), so the
     * header row and the rows agree. Set it wherever the rows render one (a server render too)
     */
    readonly weekNumberColumn = input(false, { transform: booleanInput });
    /** the host's timers, frames, `ResizeObserver` and computed styles (read when the engine is created) */
    readonly host = input<CalendarEngineOptions["host"]>(undefined);
    /** how long a touch is held before it drags or selects, ms (read when the engine is created) */
    readonly longPressDelay = input(undefined, { transform: optionalNumber });
    /** the pixels a mouse or pen press moves before a drag starts (read when the engine is created) */
    readonly dragThreshold = input(undefined, { transform: optionalNumber });
    /** the time grid's autoscroll near its scroller's edges, or `false` (read when the engine is created) */
    readonly autoScroll = input<CalendarEngineOptions["autoScroll"]>(undefined);

    /** the model's events, after every command that changes them (a drop too) */
    readonly eventsChange = output<readonly CalendarEventOf<T>[]>();
    /** the view type, when it (or a `days` view's count) changes */
    readonly viewChange = output<ViewType>();
    /** the view type and a `days` view's count, when either changes */
    readonly viewChangeDetails = output<RootView>();
    /** the view's anchor date (`YYYY-MM-DD`), when it changes */
    readonly dateChange = output<string>();
    /** a tap or Enter on an event (`event-click`) */
    readonly eventClick = output<CalendarEngineEventOf<"event-click">>();
    /** a tap on a day or a slot (`date-click`) */
    readonly dateClick = output<CalendarEngineEventOf<"date-click">>();
    /** a press, or Enter, on a day's "+N more" (`more-click`): the popover is yours */
    readonly moreClick = output<CalendarEngineEventOf<"more-click">>();
    /** today changed (the engine's clock passed midnight in the display zone) */
    readonly todayChange = output<CalendarEngineEventOf<"today-change">>();
    /** what a gesture or a key did, as data for your live region (`announce`) */
    readonly announce = output<CalendarEngineEventOf<"announce">>();

    private readonly element = injectHost();
    /** the names of the features the root's own model was created with */
    private createdWith: string | undefined;
    /** the model the root created, once it needed one */
    private own: CalendarModel<T, F> | undefined;
    /** what the controlled inputs were last sent as (a model the root creates starts at them) */
    private sent: Sent | undefined;

    /** the root's model: its `calendarRoot` input, or the one it created from the other inputs */
    readonly model: Signal<CalendarModel<T, F>> = computed(() => {
        const given = this.calendarRoot();
        if (given) return given;
        if (!this.own) this.own = untracked(() => this.createOwnModel());
        return this.own;
    });
    private readonly erased = computed(() => eraseModel(this.model()));

    private readonly facade = createEngineFacade();
    /**
     * the engine of the calendar on screen, as apps see it: screen actions
     * (`engine.run("focus", { date })`) and screen facts (`engine.get("drag-preview")`). It is
     * there from the start; before the root created its engine an action is refused and a read is
     * empty
     */
    readonly engine: CalendarEngine<T, F> = typedEngine<T, F>(
        this.facade.engine,
    );

    private readonly current = signal<AnyCalendarEngine | null>(null);
    private readonly version = signal(0);
    private readonly warned = new Set<string>();
    private readonly application = inject(ApplicationRef);
    private readonly errorHandler = inject(ErrorHandler);
    private renderQueued = false;

    /** what the parts read: the model, the engine, the version and how the app renders them */
    readonly context: CalendarContext = {
        model: this.erased,
        engine: this.current.asReadonly(),
        publicEngine: this.facade.engine,
        version: this.version.asReadonly(),
        installed: computed(
            () =>
                new Set(
                    this.erased()
                        .get("features")
                        .map((feature) => feature.name),
                ),
            { equal: (a, b) => [...a].join() === [...b].join() },
        ),
        partOptions: computed(
            (): PartAttributeOptions => ({
                weekNumberColumn: this.weekNumberColumn(),
            }),
            { equal: sameValue },
        ),
        warn: (message) => this.warn(message),
    };

    private readonly attributes = calendarValue(this.context, () => {
        const engine = this.current();
        const options = this.context.partOptions();
        return engine
            ? engine.adapter.attributes("root", {}, options)
            : partAttributes(this.erased(), "root", {}, options);
    });

    /** what the root shows (`#calendar="calendarRoot"`, then `calendar.state().view`) */
    readonly state: Signal<RootState> = calendarValue(this.context, () => ({
        view: this.erased().state.view.type,
        gestureActive: this.current()?.is("gesture-active") ?? false,
    }));

    constructor() {
        bindAttributes(this.element, this.attributes);

        // the engine and the subscriptions once the root is rendered in a browser: a server render
        // subscribes to nothing (a model may be shared by requests) and sets no timer; another
        // model makes another engine
        const rendered = signal(false);
        afterNextRender(() => rendered.set(true));

        effect((onCleanup) => {
            if (!rendered()) return;
            const model = this.erased();
            untracked(() => {
                onCleanup(model.subscribe((event) => this.committed(event)));
                // a commit between the first render and the subscription is read again
                this.changed();
            });
        });

        effect((onCleanup) => {
            if (!rendered()) return;
            const model = this.erased();
            untracked(() => {
                const created = createCalendarEngine(model, {
                    host: this.host(),
                    longPressDelay: this.longPressDelay(),
                    dragThreshold: this.dragThreshold(),
                    autoScroll: this.autoScroll(),
                }) as unknown as AnyCalendarEngine;
                const stops = [
                    created.adapter.subscribe(() => this.changed()),
                    created.subscribe((event) => this.emit(event)),
                ];
                this.facade.set(created as unknown as CalendarEngine);
                created.adapter.attachRoot(this.element);
                this.current.set(created);
                this.changed();
                onCleanup(() => {
                    for (const stop of stops) stop();
                    this.current.set(null);
                    this.facade.set(null);
                    created.adapter.detachRoot();
                    created.destroy();
                });
            });
        });

        // the controlled inputs, once rendered: a server render shows the model's state, so the
        // client hydrates it first, then renders the controlled values (React's layout effect,
        // Vue's `onMounted`)
        effect(() => {
            if (!rendered()) return;
            const model = this.erased();
            const controlled: Controlled = {
                events: this.events(),
                settings: this.settings(),
                view: this.view(),
                days: this.days(),
                date: this.date(),
            };
            untracked(() => this.sync(model, controlled));
        });

        // the calendar ref: the model and the facade (the same object across engines)
        effect((onCleanup) => {
            const ref = this.calendarRef();
            const model = this.model();
            if (!ref) return;
            untracked(() => {
                setCalendarRef(ref, { model, engine: this.engine });
                onCleanup(() => setCalendarRef(ref, null));
            });
        });

        // misuse the root ignores, once each: a later change of the features
        effect(() => {
            const features = featureNames(this.features());
            if (
                !this.calendarRoot() &&
                this.createdWith !== undefined &&
                features !== this.createdWith
            ) {
                untracked(() =>
                    this.warn(
                        "the features input changed after the root created its model: the change is ignored (the features are fixed when the model is created)",
                    ),
                );
            }
        });

        // after every render: the engine measures and focuses what it waited for (React's layout
        // effect after each commit), once the parts registered their elements (`write`)
        afterEveryRender({
            mixedReadWrite: () => {
                untracked(this.current)?.adapter.committed();
            },
        });

        onDestroy(() => this.facade.set(null));
    }

    /** The model the root creates from its inputs (read once). */
    private createOwnModel(): CalendarModel<T, F> {
        const features = this.features();
        this.createdWith = featureNames(features);
        const settings = this.settings();
        const model = createCalendarModel<T, F>(
            {
                version: 1,
                events: [
                    ...(this.events() ?? this.defaultEvents() ?? []),
                ] as CalendarEventJson<T>[],
                calendars: [...(this.defaultCalendars() ?? [])],
                ...(settings === undefined ? {} : { settings }),
            },
            { features, now: this.now(), createId: this.createId() },
        );
        const type = this.view() ?? this.defaultView();
        const days = this.days();
        if (type !== undefined) {
            model.run(
                "view.set",
                days === undefined ? { type } : { type, days },
            );
        }
        const date = this.date() ?? this.defaultDate();
        if (date !== undefined) model.run("view.go-to", { date });
        this.sent = sentOf(model, {
            events: this.events(),
            settings,
            view: this.view(),
            days,
            date: this.date(),
        });
        return model;
    }

    /**
     * Brings the model to each controlled value it was not sent yet, by the command a user would
     * run (sent, not enforced: a change the app does not echo stays in the model); a refused value
     * warns once and the model's stays.
     */
    private sync(model: AnyCalendarModel, controlled: Controlled): void {
        const previous = this.sent;
        const same = previous?.model === model;
        const next = sentOf(model, controlled);
        this.sent = next;
        const options = { meta: CONTROLLED };
        const refused: string[] = [];
        const apply = (result: {
            ok: boolean;
            error?: { message: string };
        }) => {
            if (!result.ok && result.error) refused.push(result.error.message);
        };
        const { events, settings, view, days, date } = controlled;
        if (
            events !== undefined &&
            (!same || previous?.events !== events) &&
            (events as unknown) !== model.state.events
        ) {
            apply(
                model.run(
                    "event.set-all",
                    { events: [...events] as never },
                    options,
                ),
            );
        }
        if (
            settings !== undefined &&
            (!same || previous?.settings !== next.settings)
        ) {
            apply(model.run("settings.set", { settings }, options));
        }
        if (view !== undefined && (!same || previous?.view !== next.view)) {
            const state = model.state.view;
            if (
                state.type !== view ||
                (days !== undefined && state.days !== days)
            ) {
                apply(
                    model.run(
                        "view.set",
                        days === undefined
                            ? { type: view }
                            : { type: view, days },
                        options,
                    ),
                );
            }
        }
        if (date !== undefined && (!same || previous?.date !== next.date)) {
            apply(model.run("view.go-to", { date }, options));
        }
        if (refused.length > 0) {
            this.warn(
                `a controlled input was not applied (the model's value stays):\n${refused.join("\n")}`,
            );
        }
    }

    /** A commit of the model: the change outputs (but the controlled inputs' own), then a render. */
    private committed(event: CommandEvent): void {
        this.changed();
        if (event.meta?.source === CONTROLLED.source) return;
        const { before, after } = event;
        if (before.events !== after.events) {
            this.eventsChange.emit(
                after.events as unknown as readonly CalendarEventOf<T>[],
            );
        }
        if (
            before.view.type !== after.view.type ||
            before.view.days !== after.view.days
        ) {
            this.viewChange.emit(after.view.type);
            this.viewChangeDetails.emit(
                after.view.days === undefined
                    ? { type: after.view.type }
                    : { type: after.view.type, days: after.view.days },
            );
        }
        if (before.view.anchorDate !== after.view.anchorDate) {
            this.dateChange.emit(after.view.anchorDate);
        }
    }

    /** An engine event: its output (the features' events are their directives', on the facade). */
    private emit(event: CalendarEngineEvent): void {
        switch (event.type) {
            case "event-click":
                this.eventClick.emit(event);
                break;
            case "date-click":
                this.dateClick.emit(event);
                break;
            case "more-click":
                this.moreClick.emit(event);
                break;
            case "today-change":
                this.todayChange.emit(event);
                break;
            case "announce":
                this.announce.emit(event);
                break;
            default:
                break;
        }
    }

    /** The model or the engine's view changed: the parts read again, rendered before the next task. */
    private changed(): void {
        this.version.update((value) => value + 1);
        this.renderSoon();
    }

    /**
     * Renders a change of the calendar before the next task (a microtask), as Vue and Svelte flush
     * theirs (Flow's `renderSoon`): zoneless Angular would render it in a later task (a timeout or
     * a frame), so a key press or a drop would still show the old view to whatever reads the page
     * right after it (an assistive technology, a test, the app's next handler). One render per
     * root and task, however many commits and view changes it had; none once the application is
     * destroyed. An error of that render goes to the app's `ErrorHandler`, as one of Angular's own
     * scheduled renders does (thrown from a microtask, it would reach no handler).
     */
    private renderSoon(): void {
        if (this.renderQueued) return;
        this.renderQueued = true;
        queueMicrotask(() => {
            this.renderQueued = false;
            if (this.application.destroyed) return;
            try {
                this.application.tick();
            } catch (error) {
                this.errorHandler.handleError(error);
            }
        });
    }

    private warn(message: string): void {
        if (this.warned.has(message)) return;
        this.warned.add(message);
        console.warn(`[@fragiola/calendar-angular] ${message}`);
    }
}
