import {
    type AnyTypes,
    type CalendarEngine,
    type CalendarEngineEventOf,
    type CalendarEngineEventType,
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
    ENGINE_EVENT_CALLBACKS,
    type EngineEventTypeOf,
    emittersOf,
    partAttributes,
    type ViewType,
} from "@fragiola/calendar";
import {
    defineComponent,
    h,
    nextTick,
    onBeforeUnmount,
    onMounted,
    onScopeDispose,
    provide,
    shallowRef,
    toRaw,
    watch,
} from "vue";
import {
    type CalendarHandle,
    type CalendarRef,
    setCalendarRef,
} from "../composables/create-calendar-ref";
import { useCalendarValue } from "../composables/internal";
import {
    type AnyCalendarEngine,
    type CalendarContextValue,
    CalendarKey,
    type EveryFeature,
    eraseModel,
} from "../context";
import { createEngineFacade } from "../utils/engine-facade";
import {
    type CalendarComponent,
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import {
    elementRef,
    onClient,
    type RenderSlot,
    renderElement,
} from "../utils/render";

export interface RootState {
    /** the view shown (`data-view`) */
    view: ViewType;
    /** a pointer gesture or a keyboard grab is under way */
    gestureActive: boolean;
}

type Callbacks = typeof ENGINE_EVENT_CALLBACKS;

/**
 * The root's engine events, one per engine event the model's features `F` emit
 * (`ENGINE_EVENT_CALLBACKS`, uncapitalized): `@event-click`, `@date-click`, `@more-click`,
 * `@today-change` and `@announce` always; `@select` with `selection()`, `@event-drop` with
 * `dragAndDrop()` or `resize()`, `@external-drop` with `externalDrop()`. They are fallthrough
 * attributes the root reads (`onEventClick`, …), never put on its element.
 */
export type RootEngineEmits<F extends CalendarFeatures = readonly []> = {
    [K in EngineEventTypeOf<F, CalendarEngineEventType> as Uncapitalize<
        Callbacks[K]
    >]: (event: CalendarEngineEventOf<K>) => void;
};

/** The engine's options a root takes as props (read when it creates its engine). */
export type RootEngineProps = Pick<
    CalendarEngineOptions,
    "host" | "longPressDelay" | "dragThreshold" | "autoScroll"
>;

/** A view as the root's `view` props give it. */
export interface RootView {
    type: ViewType;
    /** `days` views: how many days */
    days?: number | undefined;
}

export interface RootBaseProps<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
> extends PrimitiveProps,
        RootEngineProps {
    /**
     * the calendar model. Its middleware (`model.use`) sees every command the calendar runs, and
     * its listeners (`model.subscribe`) every change. Another model remounts the calendar (a new
     * engine). Give it, or let the root create one from the props below (read once, at mount, but
     * the controlled ones)
     */
    model?: CalendarModel<T, F> | undefined;
    /**
     * controlled events (`v-model:events`): a new list replaces the model's events
     * (`event.set-all`: give each its id); `update:events` reports every other change. A list the
     * root reported back (the model's own) runs nothing
     */
    events?: readonly (CalendarEventJson<T> | CalendarEventOf<T>)[] | undefined;
    /** the events of the model the root creates (read once, at mount) */
    defaultEvents?: readonly CalendarEventJson<T>[] | undefined;
    /** the calendars (categories) of the model the root creates (read once, at mount) */
    defaultCalendars?: readonly CalendarInfoJson<T>[] | undefined;
    /**
     * the settings: the model the root creates starts with them, and a change is applied
     * (`settings.set`, the changed value as a whole patch)
     */
    settings?: CalendarSettingsJson | undefined;
    /** controlled view type (`v-model:view`, `view.set`), with `days` for a `days` view */
    view?: ViewType | undefined;
    /** the view type of the model the root creates (read once, at mount) */
    defaultView?: ViewType | undefined;
    /** a `days` view's number of days (with `view` or `default-view`) */
    days?: number | undefined;
    /** controlled date (`v-model:date`): a new value goes to it (`view.go-to`) */
    date?: DateInput | undefined;
    /** the date the model the root creates opens on (read once, at mount); default today */
    defaultDate?: DateInput | undefined;
    /**
     * the opt-in features of the model the root creates (read once, at mount):
     * `[selection(), dragAndDrop()]`, each from its entry (`@fragiola/calendar-vue/selection`).
     * A `model` has its own
     */
    features?: F | undefined;
    /** the clock of the model the root creates (read once, at mount; D16) */
    now?: (() => number) | undefined;
    /** the id generator of the model the root creates (read once, at mount) */
    createId?: CreateId | undefined;
    /** access to the model and the engine from outside the root (`useCalendarRef`, `createCalendarRef`) */
    calendarRef?: CalendarRef<T, F> | undefined;
    /**
     * a month's rows render a `Calendar.WeekNumber` before their days: the grid counts that column
     * (`aria-colcount`, `aria-colindex` on the week numbers, days and headers), so the header row
     * and the rows agree. Set it wherever the rows render one (a server render included)
     */
    weekNumberColumn?: boolean | undefined;
}

/**
 * The engine events the features `F` do not emit, as listeners that cannot be given: `@select`
 * without `selection()` is a type error (a fallthrough attribute would compile otherwise).
 */
export type RootMissingEvents<F extends CalendarFeatures = readonly []> = {
    [K in Exclude<
        CalendarEngineEventType,
        EngineEventTypeOf<F, CalendarEngineEventType>
    > as `on${Callbacks[K]}`]?: never;
};

/**
 * The props of `Calendar.Root`, typed by the registry and the features
 * (`typedCalendar<T, F>()`): a feature's event compiles only with its feature.
 */
export type RootProps<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
> = RootBaseProps<T, F> & RootMissingEvents<F>;

export interface RootSlots extends RenderSlot<RootState> {
    /** the calendar: a toolbar of yours, `Calendar.DayGrid`, `Calendar.TimeGrid`, `Calendar.List` */
    default?: SlotFunction<Record<never, never>>;
}

/**
 * The events of `Calendar.Root`: the controlled values for `v-model:events`, `v-model:view` and
 * `v-model:date` (`update:*`), the same changes with their details (`@events-change`,
 * `@view-change` with `{ type, days }`, `@date-change`), and the engine events of the features `F`.
 */
export type RootEmits<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
> = {
    /** the model's events, after every command that changes them (a drop too) */
    "update:events": (events: readonly CalendarEventOf<T>[]) => void;
    /** the same as `update:events` */
    eventsChange: (events: readonly CalendarEventOf<T>[]) => void;
    /** the view type, when it changes */
    "update:view": (view: ViewType) => void;
    /** the view type and a `days` view's count, when either changes */
    viewChange: (view: RootView) => void;
    /** the view's anchor date (`YYYY-MM-DD`), when it changes */
    "update:date": (date: string) => void;
    /** the same as `update:date` */
    dateChange: (date: string) => void;
} & RootEngineEmits<F>;

/** The `meta` of the commands that bring the model to the controlled props. */
const CONTROLLED = Object.freeze({ source: "controlled" });

/** Each engine event's listener, as a fallthrough attribute (`onEventClick`, `onSelect`, …). */
const CALLBACK_ATTRS = (
    Object.entries(ENGINE_EVENT_CALLBACKS) as [
        CalendarEngineEventType,
        string,
    ][]
).map(([type, name]) => [type, `on${name}`] as const);
const CALLBACK_BY_TYPE: ReadonlyMap<string, string> = new Map(CALLBACK_ATTRS);
const CALLBACK_NAMES: ReadonlySet<string> = new Set(
    CALLBACK_ATTRS.map(([, name]) => name),
);

const ROOT_PROPS = [
    "model",
    "events",
    "defaultEvents",
    "defaultCalendars",
    "settings",
    "view",
    "defaultView",
    "days",
    "date",
    "defaultDate",
    "features",
    "now",
    "createId",
    "calendarRef",
    "weekNumberColumn",
    "host",
    "longPressDelay",
    "dragThreshold",
    "autoScroll",
    "as",
] as const satisfies readonly (keyof RootBaseProps)[];

const ROOT_EMITS = [
    "update:events",
    "eventsChange",
    "update:view",
    "viewChange",
    "update:date",
    "dateChange",
] as const;

/** The root's props as its implementation reads them: any registry, any features. */
type RootCalendarProps = RootBaseProps<AnyTypes, CalendarFeatures>;

/** A list of features by their names, in order: an equal new list is the same. */
function featureNames(features: CalendarFeatures | undefined): string {
    return (features ?? []).map((feature) => feature.name).join(",");
}

/** Warns once per message: misuse that the root ignores. */
function warnOnce(): (message: string) => void {
    const warned = new Set<string>();
    return (message) => {
        if (warned.has(message)) return;
        warned.add(message);
        console.warn(`[@fragiola/calendar-vue] ${message}`);
    };
}

/** The model the root creates from its props. */
function createOwnModel(
    props: RootCalendarProps,
): CalendarModel<AnyTypes, CalendarFeatures> {
    const model = createCalendarModel<AnyTypes, CalendarFeatures>(
        {
            version: 1,
            events: [
                ...(toRaw(props.events) ?? props.defaultEvents ?? []),
            ] as CalendarEventJson[],
            calendars: [...(props.defaultCalendars ?? [])],
            ...(props.settings === undefined
                ? {}
                : { settings: toRaw(props.settings) }),
        },
        { features: props.features, now: props.now, createId: props.createId },
    );
    const type = props.view ?? props.defaultView;
    if (type !== undefined) {
        model.run(
            "view.set",
            props.days === undefined ? { type } : { type, days: props.days },
        );
    }
    const date = props.date ?? props.defaultDate;
    if (date !== undefined) model.run("view.go-to", { date: toRaw(date) });
    return model;
}

/** What the controlled props were last sent as (a value equal to it sends nothing). */
interface Sent {
    model: unknown;
    events: unknown;
    settings: string;
    view: string;
    date: string;
}

function sentOf(model: unknown, props: RootCalendarProps): Sent {
    return {
        model,
        events: toRaw(props.events),
        settings: JSON.stringify(props.settings ?? null),
        view: `${props.view}/${props.days}`,
        date: JSON.stringify(props.date ?? null),
    };
}

/** a key per object: another model remounts the calendar (`-1` for none) */
const modelKeys = new WeakMap<object, number>();
let nextModelKey = 0;
function keyOfModel(model: object | undefined): number {
    if (model === undefined) return -1;
    let key = modelKeys.get(model);
    if (key === undefined) {
        key = nextModelKey++;
        modelKeys.set(model, key);
    }
    return key;
}

/** The calendar of one model: it owns the engine, so it lives as long as the model does. */
const RootCalendar = definePrimitive<
    RootCalendarProps,
    RootSlots,
    Record<string, (...args: never[]) => void>
>(
    "RootCalendar",
    ROOT_PROPS,
    (props, { attrs, slots, emit }) => {
        const own = props.model ? null : createOwnModel(props);
        const typed = (props.model ?? own) as CalendarModel<
            AnyTypes,
            CalendarFeatures
        >;
        // the parts below work on the erased registry; the typed surface is `typedCalendar`
        const model = eraseModel(typed);

        // the features are the model's, fixed when it is created: a later change is ignored
        const warn = warnOnce();
        const features = featureNames(props.features);
        watch(
            () => featureNames(props.features),
            (next) => {
                if (!props.model && next !== features) {
                    warn(
                        "the features prop changed after the root created its model: the change is ignored (the features are fixed when the model is created)",
                    );
                }
            },
        );
        const installed: ReadonlySet<string> = new Set(
            model.get("features").map((feature) => feature.name),
        );
        watch(
            () =>
                CALLBACK_ATTRS.filter(([, name]) => attrs[name] !== undefined),
            (given) => {
                for (const [type, name] of given) {
                    const emitters = emittersOf(type);
                    if (
                        emitters.length > 0 &&
                        !emitters.some((feature) => installed.has(feature))
                    ) {
                        warn(
                            `${name} needs the ${emitters.join(" or ")} feature (in the model's features): it is never called`,
                        );
                    }
                }
            },
            { immediate: true },
        );

        const facade = createEngineFacade();
        const version = shallowRef(0);
        const engine = shallowRef<AnyCalendarEngine | null>(null);
        // on the client only: a server render never subscribes to a model other requests may share
        onClient(() => {
            onScopeDispose(
                model.subscribe(() => {
                    version.value++;
                }),
            );
        });

        // the engine is created once mounted, so that no render ever subscribes to the model or
        // sets a timer; the engine's options are read then
        let stop: (() => void) | undefined;
        onMounted(() => {
            const created = createCalendarEngine(model, {
                host: props.host,
                longPressDelay: props.longPressDelay,
                dragThreshold: props.dragThreshold,
                autoScroll: props.autoScroll,
            }) as unknown as AnyCalendarEngine;
            const stopEvents = created.subscribe((event) => {
                const name = CALLBACK_BY_TYPE.get(event.type);
                // the listener is read when the event comes: a new one recreates nothing
                const listener = name ? attrs[name] : undefined;
                if (typeof listener === "function") listener(event);
                else if (Array.isArray(listener)) {
                    for (const one of listener) {
                        if (typeof one === "function") one(event);
                    }
                }
            });
            const stopView = created.adapter.subscribe(() => {
                version.value++;
            });
            stop = () => {
                stopEvents();
                stopView();
            };
            facade.set(created as unknown as CalendarEngine);
            engine.value = created;
        });
        onBeforeUnmount(() => {
            const current = engine.value;
            stop?.();
            facade.set(null);
            engine.value = null;
            current?.destroy();
        });
        // after each commit that follows a change, the engine measures and focuses what it waited
        // for (React's layout effect after every root render)
        watch(
            [version, engine],
            () => {
                // after the registrations of the elements this flush inserted (internal.ts)
                void nextTick().then(() => engine.value?.adapter.committed());
            },
            { flush: "post" },
        );

        // the calendar ref: the model and the facade (the same object across engines)
        const handle = {
            model: typed,
            engine: facade.engine,
        } as unknown as CalendarHandle;
        let mounted = false;
        onMounted(() => {
            mounted = true;
            if (props.calendarRef) setCalendarRef(props.calendarRef, handle);
        });
        watch(
            () => props.calendarRef,
            (next, previous) => {
                if (previous) setCalendarRef(previous, null);
                if (next && mounted) setCalendarRef(next, handle);
            },
        );
        onBeforeUnmount(() => {
            mounted = false;
            if (props.calendarRef) setCalendarRef(props.calendarRef, null);
        });

        // the change events, on every commit that changes what they report (but the controlled
        // props' own commands)
        onClient(() => {
            onScopeDispose(
                model.subscribe((event: CommandEvent) => {
                    if (event.meta?.source === CONTROLLED.source) return;
                    const { before, after } = event;
                    if (before.events !== after.events) {
                        emit("update:events", after.events);
                        emit("eventsChange", after.events);
                    }
                    if (
                        before.view.type !== after.view.type ||
                        before.view.days !== after.view.days
                    ) {
                        if (before.view.type !== after.view.type) {
                            emit("update:view", after.view.type);
                        }
                        emit(
                            "viewChange",
                            after.view.days === undefined
                                ? { type: after.view.type }
                                : {
                                      type: after.view.type,
                                      days: after.view.days,
                                  },
                        );
                    }
                    if (before.view.anchorDate !== after.view.anchorDate) {
                        emit("update:date", after.view.anchorDate);
                        emit("dateChange", after.view.anchorDate);
                    }
                }),
            );
        });

        // the controlled props: each value the root has not sent yet is brought to the model by
        // the command a user would run (a model the root created starts at them)
        let sent = sentOf(own, props);
        const sync = () => {
            const previous = sent;
            const same = previous.model === model;
            const next = sentOf(model, props);
            sent = next;
            const events = toRaw(props.events);
            const { settings, view, days } = props;
            const date = toRaw(props.date);
            const options = { meta: CONTROLLED };
            const refused: string[] = [];
            const apply = (result: {
                ok: boolean;
                error?: { message: string };
            }) => {
                if (!result.ok && result.error) {
                    refused.push(result.error.message);
                }
            };
            if (
                events !== undefined &&
                (!same || previous.events !== events) &&
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
                (!same || previous.settings !== next.settings)
            ) {
                apply(
                    model.run(
                        "settings.set",
                        { settings: toRaw(settings) },
                        options,
                    ),
                );
            }
            if (view !== undefined && (!same || previous.view !== next.view)) {
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
            if (date !== undefined && (!same || previous.date !== next.date)) {
                apply(model.run("view.go-to", { date }, options));
            }
            if (refused.length > 0) {
                warn(
                    `a controlled prop was not applied (the model's value stays):\n${refused.join("\n")}`,
                );
            }
        };
        // once mounted, as React's layout effects: a server render shows the model's state, so the
        // client hydrates it first (a prop applied before the mount would be a hydration mismatch,
        // which Vue never rectifies in production), then renders the controlled values before paint
        onMounted(sync);
        watch(
            () => {
                const next = sentOf(model, props);
                return [next.events, next.settings, next.view, next.date];
            },
            () => sync(),
        );

        const context: CalendarContextValue = {
            model,
            engine,
            publicEngine: facade.engine,
            version,
            installed,
            warn,
            partOptions: {
                // a bare attribute (`week-number-column`) is the empty string: the props are untyped
                get weekNumberColumn() {
                    const value: unknown = props.weekNumberColumn;
                    return value === true || value === "";
                },
            },
        };
        provide(CalendarKey, context);

        const attributes = useCalendarValue(context, () => {
            const live = engine.value;
            return live
                ? live.adapter.attributes("root", {})
                : partAttributes(model, "root", {});
        });
        const gestureActive = useCalendarValue(
            context,
            () => engine.value?.is("gesture-active") ?? false,
        );
        const viewType = useCalendarValue(context, () => model.state.view.type);
        const rootRef = elementRef(
            (element) => {
                const live = engine.value;
                if (!live) return undefined;
                live.adapter.attachRoot(element);
                return () => live.adapter.detachRoot();
            },
            () => [engine.value],
        );

        return () => {
            // the engine's listeners are the root's, never its element's (`onSelect` is not the
            // DOM's `select` here)
            const elementAttrs: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(attrs)) {
                if (!CALLBACK_NAMES.has(key)) elementAttrs[key] = value;
            }
            // read so that the root renders again (and attaches its element) once the engine exists
            engine.value;
            const state: RootState = {
                view: viewType.value,
                gestureActive: gestureActive.value,
            };
            return renderElement({
                tag: "div",
                as: props.as,
                attrs: elementAttrs,
                render: slots.render,
                state,
                props: { ...attributes.value },
                ref: rootRef,
                children: () => slots.default?.({}),
            });
        };
    },
    { emits: ROOT_EMITS },
);

/**
 * The calendar (`data-calendar-part="root"`), for any registry and any features
 * (`typedCalendar<T, F>()` types it by yours): owns the model (unless given) and its engine,
 * attaches the engine to its element (the engine listens to it: pointers, keys, focus, native
 * drags) and renders only its default slot; no provider is needed above it. Its parts re-render
 * when what they show changes. Another `model` remounts the calendar.
 */
export const Root: CalendarComponent<
    RootBaseProps<AnyTypes, CalendarFeatures>,
    RootSlots,
    RootEmits<AnyTypes, EveryFeature>
> = defineComponent({
    name: "CalendarRoot",
    inheritAttrs: false,
    props: [...ROOT_PROPS],
    emits: [...ROOT_EMITS],
    setup(props, { attrs, slots, emit }) {
        const forward = Object.fromEntries(
            ROOT_EMITS.map((event) => [
                `on${event[0]?.toUpperCase()}${event.slice(1)}`,
                (value: unknown) => emit(event, value as never),
            ]),
        );
        return () =>
            h(
                RootCalendar,
                {
                    ...attrs,
                    ...props,
                    ...forward,
                    key: keyOfModel(toRaw((props as { model?: object }).model)),
                },
                slots,
            );
    },
}) as unknown as CalendarComponent<
    RootBaseProps<AnyTypes, CalendarFeatures>,
    RootSlots,
    RootEmits<AnyTypes, EveryFeature>
>;
