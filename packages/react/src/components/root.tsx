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
import * as React from "react";
import {
    type AnyCalendarEngine,
    CalendarContext,
    type CalendarContextValue,
    eraseModel,
} from "../context";
import { type CalendarRef, setCalendarRef } from "../hooks/create-calendar-ref";
import {
    reactAttributes,
    useCalendarValue,
    useIsomorphicLayoutEffect,
} from "../hooks/internal";
import { createCalendarStore } from "../utils/calendar-store";
import { createEngineFacade } from "../utils/engine-facade";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface RootState {
    /** the view shown (`data-view`) */
    view: ViewType;
    /** a pointer gesture or a keyboard grab is under way */
    gestureActive: boolean;
}

type Callbacks = typeof ENGINE_EVENT_CALLBACKS;

/**
 * The root's engine event callbacks, one per engine event the model's features `F` emit
 * (`ENGINE_EVENT_CALLBACKS`): `onEventClick`, `onDateClick`, `onMoreClick`, `onTodayChange` and
 * `onAnnounce` always; `onSelect` with `selection()`, `onEventDrop` with `dragAndDrop()` or
 * `resize()`, `onExternalDrop` with `externalDrop()`.
 */
export type RootEventProps<F extends CalendarFeatures = readonly []> = {
    [K in EngineEventTypeOf<
        F,
        CalendarEngineEventType
    > as `on${Callbacks[K]}`]?:
        | ((event: CalendarEngineEventOf<K>) => void)
        | undefined;
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
> extends Omit<DivPrimitiveProps<RootState>, "onSelect">,
        RootEngineProps {
    /**
     * the calendar model. Its middleware (`model.use`) sees every command the calendar runs, and
     * its listeners (`model.subscribe`) every change. A new model identity creates a new engine.
     * Give it, or let the root create one from the props below (read once, at mount, but the
     * controlled ones)
     */
    model?: CalendarModel<T, F> | undefined;
    /**
     * controlled events: a new list replaces the model's events (`event.set-all`: give each its
     * id); `onEventsChange` hears every other change. A list the root reported back (the model's
     * own) runs nothing
     */
    events?: readonly (CalendarEventJson<T> | CalendarEventOf<T>)[] | undefined;
    /** the events of the model the root creates (read once, at mount) */
    defaultEvents?: readonly CalendarEventJson<T>[] | undefined;
    /** called with the model's events after every command that changes them (a drop too) */
    onEventsChange?:
        | ((events: readonly CalendarEventOf<T>[]) => void)
        | undefined;
    /** the calendars (categories) of the model the root creates (read once, at mount) */
    defaultCalendars?: readonly CalendarInfoJson<T>[] | undefined;
    /**
     * the settings: the model the root creates starts with them, and a change is applied
     * (`settings.set`, the changed value as a whole patch)
     */
    settings?: CalendarSettingsJson | undefined;
    /** controlled view type (`view.set`), with `days` for a `days` view */
    view?: ViewType | undefined;
    /** the view type of the model the root creates (read once, at mount) */
    defaultView?: ViewType | undefined;
    /** a `days` view's number of days (with `view` or `defaultView`) */
    days?: number | undefined;
    /** called when the view type (or a `days` view's count) changes */
    onViewChange?: ((view: RootView) => void) | undefined;
    /** controlled date: a new value goes to it (`view.go-to`) */
    date?: DateInput | undefined;
    /** the date the model the root creates opens on (read once, at mount); default today */
    defaultDate?: DateInput | undefined;
    /** called with the view's anchor date (`YYYY-MM-DD`) when it changes */
    onDateChange?: ((date: string) => void) | undefined;
    /**
     * the opt-in features of the model the root creates (read once, at mount):
     * `[selection(), dragAndDrop()]`, each from its entry (`@fragiola/calendar-react/selection`).
     * A `model` has its own
     */
    features?: F | undefined;
    /** the clock of the model the root creates (read once, at mount; D16) */
    now?: (() => number) | undefined;
    /** the id generator of the model the root creates (read once, at mount) */
    createId?: CreateId | undefined;
    /** access to the model and the engine from outside the root (`useCalendarRef`, `createCalendarRef`) */
    calendarRef?: CalendarRef<T, F> | undefined;
    children?: React.ReactNode;
}

/**
 * The props of `Calendar.Root`: every calendar's, and the engine event callbacks the features `F`
 * emit. A feature's callback compiles only when the feature is installed:
 * `<Calendar.Root<Types, typeof features>>`, or a `model` of those features.
 */
export type RootProps<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
> = RootBaseProps<T, F> & RootEventProps<F>;

/** The `meta` of the commands that bring the model to the controlled props. */
const CONTROLLED = Object.freeze({ source: "controlled" });

const CALLBACK_PROPS = (
    Object.entries(ENGINE_EVENT_CALLBACKS) as [
        CalendarEngineEventType,
        string,
    ][]
).map(([type, name]) => [type, `on${name}`] as const);
const CALLBACK_BY_TYPE: ReadonlyMap<string, string> = new Map(CALLBACK_PROPS);

/** Splits the engine event callbacks off a root's other props. */
function splitCallbacks<P extends object>(
    props: P,
): [Record<string, unknown>, P] {
    const callbacks: Record<string, unknown> = {};
    const rest = { ...props } as Record<string, unknown>;
    for (const [, name] of CALLBACK_PROPS) {
        if (name in rest) {
            callbacks[name] = rest[name];
            delete rest[name];
        }
    }
    return [callbacks, rest as P];
}

/** A list of features by their names, in order: an equal new list (`features={[selection()]}`) is the same. */
function featureNames(features: CalendarFeatures | undefined): string {
    return (features ?? []).map((feature) => feature.name).join(",");
}

/** Warns once per message and root: misuse that the root ignores. */
function useWarnOnce() {
    const [warned] = React.useState(() => new Set<string>());
    return React.useCallback(
        (message: string) => {
            if (warned.has(message)) return;
            warned.add(message);
            console.warn(`[@fragiola/calendar-react] ${message}`);
        },
        [warned],
    );
}

/** The model the root creates from its props. */
function createOwnModel<T extends CalendarTypes, F extends CalendarFeatures>(
    props: RootBaseProps<T, F>,
): CalendarModel<T, F> {
    const model = createCalendarModel<T, F>(
        {
            version: 1,
            events: [
                ...(props.events ?? props.defaultEvents ?? []),
            ] as CalendarEventJson<T>[],
            calendars: [...(props.defaultCalendars ?? [])],
            ...(props.settings === undefined
                ? {}
                : { settings: props.settings }),
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
    if (date !== undefined) model.run("view.go-to", { date });
    return model;
}

/**
 * The calendar (`data-calendar-part="root"`): owns the model (unless given) and its engine,
 * attaches the engine to its element (the engine listens to it: pointers, keys, focus, native
 * drags) and renders only its children; no Provider is needed above it. Its parts re-render when
 * what they show changes.
 */
export function Root<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
>(allProps: RootProps<T, F>) {
    const [callbacks, props] = splitCallbacks(allProps as RootBaseProps<T, F>);
    const {
        model: modelProp,
        events,
        defaultEvents,
        onEventsChange,
        defaultCalendars,
        settings,
        view,
        defaultView,
        days,
        onViewChange,
        date,
        defaultDate,
        onDateChange,
        features,
        now,
        createId,
        calendarRef,
        host,
        longPressDelay,
        dragThreshold,
        autoScroll,
        children,
        ...rest
    } = props;
    // created the first time the root has no model prop, even after mount (a dropped `model`)
    const ownModel = React.useRef<CalendarModel<T, F> | null>(null);
    if (!modelProp && ownModel.current === null) {
        ownModel.current = createOwnModel(props);
    }
    const typed = (modelProp ?? ownModel.current) as CalendarModel<T, F>;
    // the parts below work on the erased registry; the typed surface is their props
    const model = eraseModel(typed);

    // the features are the model's, fixed when it is created: a later change is ignored
    const warn = useWarnOnce();
    const [firstFeatures] = React.useState(() => featureNames(features));
    if (!modelProp && featureNames(features) !== firstFeatures) {
        warn(
            "the features prop changed after the root created its model: the change is ignored (the features are fixed when the model is created)",
        );
    }
    const installedKey = model
        .get("features")
        .map((feature) => feature.name)
        .join(",");
    const installed = React.useMemo(
        () => new Set(installedKey.split(",").filter(Boolean)),
        [installedKey],
    );
    for (const [name, callback] of Object.entries(callbacks)) {
        const type = CALLBACK_PROPS.find(([, prop]) => prop === name)?.[0];
        const emitters = type === undefined ? [] : emittersOf(type);
        if (
            callback !== undefined &&
            emitters.length > 0 &&
            !emitters.some((feature) => installed.has(feature))
        ) {
            warn(
                `${name} needs the ${emitters.join(" or ")} feature (in the model's features): it is never called`,
            );
        }
    }

    // the callbacks are read when called: a new function each render recreates nothing
    const latest = React.useRef({
        callbacks,
        onEventsChange,
        onViewChange,
        onDateChange,
        engine: { host, longPressDelay, dragThreshold, autoScroll },
    });
    latest.current = {
        callbacks,
        onEventsChange,
        onViewChange,
        onDateChange,
        engine: { host, longPressDelay, dragThreshold, autoScroll },
    };

    const [facade] = React.useState(createEngineFacade);
    const store = React.useMemo(() => createCalendarStore(model), [model]);
    const [engine, setEngine] = React.useState<AnyCalendarEngine | null>(null);
    // the engine is created once mounted, in the commit (StrictMode's second mount creates a new
    // one), so that no render ever subscribes to the model or sets a timer
    useIsomorphicLayoutEffect(() => {
        const created = createCalendarEngine(
            model,
            latest.current.engine,
        ) as unknown as AnyCalendarEngine;
        const stop = created.subscribe((event) => {
            const name = CALLBACK_BY_TYPE.get(event.type);
            const callback = name ? latest.current.callbacks[name] : undefined;
            if (typeof callback === "function") callback(event);
        });
        facade.set(created as unknown as CalendarEngine);
        store.setEngine(created as unknown as CalendarEngine);
        setEngine(created);
        return () => {
            stop();
            facade.set(null);
            store.setEngine(null);
            created.destroy();
        };
    }, [model, facade, store]);
    // a destroyed engine (StrictMode's first mount, a replaced model) is never used again
    const live = engine && engine.adapter.model === model ? engine : null;

    useIsomorphicLayoutEffect(() => {
        if (!calendarRef) return;
        setCalendarRef(calendarRef, {
            model: typed,
            engine: facade.engine as unknown as CalendarEngine<T, F>,
        });
        return () => setCalendarRef(calendarRef, null);
    }, [calendarRef, typed, facade]);

    // the change callbacks, on every commit that changes what they report (but the controlled
    // props' own commands)
    useIsomorphicLayoutEffect(
        () =>
            model.subscribe((event: CommandEvent) => {
                if (event.meta?.source === CONTROLLED.source) return;
                const { before, after } = event;
                const current = latest.current;
                if (before.events !== after.events) {
                    current.onEventsChange?.(
                        after.events as unknown as readonly CalendarEventOf<T>[],
                    );
                }
                if (
                    before.view.type !== after.view.type ||
                    before.view.days !== after.view.days
                ) {
                    current.onViewChange?.(
                        after.view.days === undefined
                            ? { type: after.view.type }
                            : { type: after.view.type, days: after.view.days },
                    );
                }
                if (before.view.anchorDate !== after.view.anchorDate) {
                    current.onDateChange?.(after.view.anchorDate);
                }
            }),
        [model],
    );

    // the controlled props: each value the root has not sent yet is brought to the model by the
    // command a user would run (a model the root created starts at them)
    const sent = React.useRef({
        model: ownModel.current as unknown,
        events: events as unknown,
        settings: JSON.stringify(settings ?? null),
        view: `${view}/${days}`,
        date: JSON.stringify(date ?? null),
    });
    useIsomorphicLayoutEffect(() => {
        const previous = sent.current;
        const same = previous.model === model;
        const next = {
            model: model as unknown,
            events: events as unknown,
            settings: JSON.stringify(settings ?? null),
            view: `${view}/${days}`,
            date: JSON.stringify(date ?? null),
        };
        sent.current = next;
        const options = { meta: CONTROLLED };
        const refused: string[] = [];
        const apply = (result: {
            ok: boolean;
            error?: { message: string };
        }) => {
            if (!result.ok && result.error) refused.push(result.error.message);
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
            apply(model.run("settings.set", { settings }, options));
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
    });

    const rootRef = React.useCallback(
        (element: HTMLElement | null) => {
            if (!element || !live) return;
            live.adapter.attachRoot(element);
            return () => live.adapter.detachRoot();
        },
        [live],
    );

    const context = React.useMemo<CalendarContextValue>(
        () => ({
            model,
            engine: live,
            publicEngine: facade.engine,
            store,
            installed,
            warn,
        }),
        [model, live, facade, store, installed, warn],
    );

    // every change re-renders the root (its children are the app's elements, which do not
    // re-render with it): after each commit the engine measures and focuses what it waited for
    React.useSyncExternalStore(store.subscribe, store.version, store.version);
    const attributes = useCalendarValue(context, () =>
        live
            ? live.adapter.attributes("root", {})
            : partAttributes(model, "root", {}),
    );
    const gestureActive = useCalendarValue(
        context,
        () => live?.is("gesture-active") ?? false,
    );
    useIsomorphicLayoutEffect(() => {
        live?.adapter.committed();
    });
    const state: RootState = {
        view: model.state.view.type,
        gestureActive,
    };
    const element = useRenderElement("div", rest, {
        state,
        ref: rootRef,
        props: { ...reactAttributes(attributes), children },
    });
    return (
        <CalendarContext.Provider value={context}>
            {element}
        </CalendarContext.Provider>
    );
}
