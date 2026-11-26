// The engine an app sees through `injectCalendar()` and a calendar ref: always there, even before
// the root rendered (the first render, the server), and the same object when the root replaces its
// engine (a new model). It forwards every verb to the root's current engine; with none, an action
// is refused and a read gives the empty answer (no focus, no drag). From packages/react's
// (src/utils/engine-facade.ts, Tree's: fragiola/tree), same author and licence.
import type {
    CalendarEngine,
    CalendarEngineAdapter,
    CalendarEngineEvent,
    CommandResult,
    EngineGetKey,
    EngineGetMap,
} from "@fragiola/calendar";

/** The facade, and how the root points it at its current engine. */
export interface EngineFacade {
    readonly engine: CalendarEngine;
    /** points the facade at `engine` (null: the root unmounted) */
    set(engine: CalendarEngine | null): void;
}

const NOT_MOUNTED: CommandResult<never> = Object.freeze({
    ok: false,
    error: Object.freeze({
        code: "refused",
        message: "the calendar is not mounted",
    }),
});

const EMPTY: { [K in EngineGetKey]: EngineGetMap[K]["result"] } = {
    focused: null,
    "tab-stop": null,
    "day-grid": null,
    "max-lanes": null,
    direction: "ltr",
    "point-at": null,
    "drag-preview": null,
    "resize-preview": null,
    "selection-preview": null,
    "selection-segments": null,
    "now-position": null,
};

type Verb = (key: string, payload?: unknown) => unknown;

export function createEngineFacade(): EngineFacade {
    let current: CalendarEngine | null = null;
    let unsubscribe: () => void = () => {};
    const listeners = new Set<(event: CalendarEngineEvent) => void>();
    const forward =
        (verb: "run" | "can" | "check" | "get" | "is", fallback: Verb) =>
        (key: string, payload?: unknown) =>
            current
                ? (current[verb] as unknown as Verb)(key, payload)
                : fallback(key, payload);
    const engine = Object.freeze({
        run: forward("run", () => NOT_MOUNTED),
        can: forward("can", () => false),
        check: forward("check", () => NOT_MOUNTED),
        get: forward("get", (key) =>
            Object.hasOwn(EMPTY, key) ? EMPTY[key as EngineGetKey] : undefined,
        ),
        is: forward("is", () => false),
        // what happens on screen, from whichever engine the root has
        subscribe(listener: (event: CalendarEngineEvent) => void) {
            const wrapper = (event: CalendarEngineEvent) => listener(event);
            listeners.add(wrapper);
            return () => {
                listeners.delete(wrapper);
            };
        },
        // the root owns its engine and destroys it when it unmounts
        destroy() {},
        get adapter(): CalendarEngineAdapter {
            if (!current) throw new Error("the calendar is not mounted");
            return current.adapter;
        },
    }) as unknown as CalendarEngine;
    return {
        engine,
        set(next) {
            if (next === current) return;
            unsubscribe();
            current = next;
            unsubscribe = next
                ? next.subscribe((event) => {
                      for (const listener of [...listeners]) listener(event);
                  })
                : () => {};
        },
    };
}
