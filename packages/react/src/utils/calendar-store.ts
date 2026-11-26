// One subscription per root to what a calendar's parts show: every commit of the model and every
// view change of the engine (focus, a gesture's preview, a measurement, the clock) bump one
// version. Each part reads its value again on a new version and re-renders only when the value
// changed (`useCalendarValue`), so a drag step re-renders the dragged event and its preview, not
// the grid.
import type { CalendarEngine, CalendarModel } from "@fragiola/calendar";

/** The root's store: a version and its listeners. */
export interface CalendarStore {
    /** a number that changes whenever the model or the engine's view does */
    version(): number;
    /** calls `listener` on every change; returns its remover */
    subscribe(listener: () => void): () => void;
    /** follows `engine`'s view changes (null: none) */
    setEngine(engine: CalendarEngine | null): void;
}

/** The store of a root's model. */
export function createCalendarStore(model: CalendarModel): CalendarStore {
    let version = 0;
    const listeners = new Set<() => void>();
    let stopModel: (() => void) | undefined;
    let stopEngine: (() => void) | undefined;
    let engine: CalendarEngine | null = null;
    const changed = () => {
        version++;
        for (const listener of [...listeners]) listener();
    };
    const follow = () => {
        stopEngine?.();
        stopEngine = engine?.adapter.subscribe(changed);
    };
    return {
        version: () => version,
        subscribe(listener) {
            listeners.add(listener);
            if (listeners.size === 1) {
                stopModel = model.subscribe(changed);
                follow();
            }
            return () => {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    stopModel?.();
                    stopEngine?.();
                    stopModel = undefined;
                    stopEngine = undefined;
                }
            };
        },
        setEngine(next) {
            if (next === engine) return;
            engine = next;
            if (listeners.size > 0) follow();
            changed();
        },
    };
}
