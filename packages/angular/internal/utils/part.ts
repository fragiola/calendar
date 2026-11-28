// A part's wiring (React's `usePart`, Vue's): the attributes the core gives it, kept on its element
// (before the engine exists, the model's `partAttributes`, so a server render and the first client
// render are the same), and its registration with the engine (which measures, hit-tests and
// focuses what is registered), after the render that gave the element its attributes.
import {
    afterRenderEffect,
    computed,
    effect,
    type Injector,
    type Signal,
    untracked,
} from "@angular/core";
import {
    type PartAttributes,
    type PartName,
    type PartPayloadMap,
    partAttributes,
} from "@fragiola/calendar";
import { calendarValue } from "./calendar-value";
import type { CalendarContext } from "./context";
import { beforeInputs, bindAttributes } from "./helpers";

/** The element each key of an engine was last registered with. */
const owners = new WeakMap<object, Map<string, HTMLElement>>();

/**
 * Registers `element` with the engine and returns its remover, which unregisters only while
 * `element` is still the one registered under its part and payload: a row whose view is created
 * again can register its new element before its old one is gone (Tree's `registerElement`).
 */
function registerElement<P extends PartName>(
    context: CalendarContext,
    part: P,
    payload: PartPayloadMap[P],
    key: string,
    element: HTMLElement,
): () => void {
    const engine = untracked(context.engine);
    if (!engine) return () => {};
    let registered = owners.get(engine);
    if (!registered) {
        registered = new Map();
        owners.set(engine, registered);
    }
    const map = registered;
    const owner = `${part} ${key}`;
    map.set(owner, element);
    engine.adapter.register(part, payload, element);
    context.touched();
    return () => {
        if (map.get(owner) === element) {
            map.delete(owner);
            engine.adapter.register(part, payload, null);
            context.touched();
        }
    };
}

/** How a part is bound to its element. */
export interface BindPartOptions {
    /** registers the element (a decoration shown in several places at once is not); default true */
    readonly register?: boolean;
    /** the injector of a view the part's element is in (a structural part's), else the directive's */
    readonly injector?: Injector;
}

/**
 * Binds a part to its element: its attributes, kept on it, and its registration with the engine
 * (again when the engine or the payload changes). `payload` may read the directive's inputs: until
 * they are set the part has no attributes. Returns the attributes, for the part's state.
 */
export function bindPart<P extends PartName>(
    context: CalendarContext,
    element: HTMLElement,
    part: P,
    payload: () => PartPayloadMap[P] | undefined,
    options: BindPartOptions = {},
): Signal<PartAttributes> {
    const { register = true, injector } = options;
    const given = () => beforeInputs(undefined, payload);
    // the engine's record is the same object while the part's attributes are (Issue #24)
    const attributes = calendarValue(
        context,
        (): PartAttributes => {
            const now = given();
            if (now === undefined) return {};
            const engine = context.engine();
            const partOptions = context.partOptions();
            return engine
                ? engine.adapter.attributes(part, now, partOptions)
                : partAttributes(context.model(), part, now, partOptions);
        },
        { part },
    );
    bindAttributes(element, attributes, injector);
    if (register) {
        // by its value: a new payload object of the same part keeps the registration
        const key = computed(() => {
            const now = given();
            return now === undefined ? undefined : JSON.stringify(now);
        });
        afterRenderEffect(
            {
                write: (onCleanup) => {
                    const engine = context.engine();
                    const now = key();
                    if (!engine || now === undefined) return;
                    untracked(() => {
                        const value = JSON.parse(now) as PartPayloadMap[P];
                        onCleanup(
                            registerElement(context, part, value, now, element),
                        );
                    });
                },
            },
            injector ? { injector } : undefined,
        );
    }
    return attributes;
}

/** Whether a boolean `data-*` attribute is present. */
export function flag(attributes: PartAttributes, name: string): boolean {
    return attributes[`data-${name}`] !== undefined;
}

/** The state every occurrence's element shows (a segment, a timed event, a list event). */
export interface EventState {
    eventId: string;
    occurrenceId: string;
    /** its calendar (category) */
    calendarId: string | undefined;
    allDay: boolean;
    /** this element's part started before its row, column or day */
    continuesBefore: boolean;
    /** this element's part ends after its row, column or day */
    continuesAfter: boolean;
    /** it holds the roving focus */
    focused: boolean;
    /** a pointer drags it (`dragAndDrop()`) */
    dragging: boolean;
    /** the keyboard grabbed it (`dragAndDrop()`) */
    grabbed: boolean;
    /** it is being resized (`resize()`) */
    resizing: boolean;
}

/** An occurrence's element state, from its attributes. */
export function eventStateOf(attributes: PartAttributes): EventState {
    return {
        eventId: attributes["data-event-id"] ?? "",
        occurrenceId: attributes["data-occurrence-id"] ?? "",
        calendarId: attributes["data-calendar-id"],
        allDay: flag(attributes, "all-day"),
        continuesBefore: flag(attributes, "continues-before"),
        continuesAfter: flag(attributes, "continues-after"),
        focused: flag(attributes, "focused"),
        dragging: flag(attributes, "dragging"),
        grabbed: flag(attributes, "grabbed"),
        resizing: flag(attributes, "resizing"),
    };
}

/** What a navigation button shows (`[calendarPrevious]`, `Next`, `Today`, `ViewButton`). */
export interface CommandButtonState {
    /** its command cannot run now (`model.can` says no: outside `validRange`) */
    disabled: boolean;
}

/**
 * Whether the root's model has a feature, as a signal; a part of a feature it lacks warns once
 * (the part then renders nothing). Call it in the part's constructor.
 */
export function injectFeature(
    context: CalendarContext,
    feature: string,
    part: string,
): Signal<boolean> {
    const installed = computed(() => context.installed().has(feature));
    effect(() => {
        if (installed()) return;
        untracked(() =>
            context.warn(
                `${part} needs the ${feature} feature (\`${feature}()\` in the model's features): it renders nothing`,
            ),
        );
    });
    return installed;
}
