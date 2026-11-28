// One subscription per root to what a calendar's parts show: every commit of the model and every
// view change of the engine (focus, a gesture's preview, a measurement, the clock) bump one
// version. The store keeps the last changes, so a part asks whether one since its last read may
// change what it shows (`changedSince`: the engine's `affects` for its part, Issue #25) and skips
// the read otherwise; one it reads again re-renders only when the value changed
// (`useCalendarValue`), so a drag step re-renders the dragged event and its preview, not the grid.
import type {
    CalendarEngine,
    CalendarModel,
    PartName,
    ViewChange,
} from "@fragiola/calendar";

/** The root's store: a version, the last changes and its listeners. */
export interface CalendarStore {
    /** a number that changes whenever the model or the engine's view does */
    version(): number;
    /**
     * whether a change after version `since` may change what `part` shows: a model commit or a
     * new engine always may, a view change when the engine's `affects` says so; with no part, any
     * change
     */
    changedSince(since: number, part?: PartName): boolean;
    /** calls `listener` on every change; returns its remover */
    subscribe(listener: () => void): () => void;
    /** follows `engine`'s view changes (null: none) */
    setEngine(engine: CalendarEngine | null): void;
}

/** How many changes the store keeps: a part that missed more reads again. */
const KEPT = 32;

/** A change: its version, and the view change (null: the model or the engine changed). */
interface Change {
    readonly version: number;
    readonly view: ViewChange | null;
}

/** The store of a root's model. */
export function createCalendarStore(model: CalendarModel): CalendarStore {
    let version = 0;
    const changes: Change[] = [];
    const listeners = new Set<() => void>();
    let stopModel: (() => void) | undefined;
    let stopEngine: (() => void) | undefined;
    let engine: CalendarEngine | null = null;
    const changed = (view: ViewChange | null) => {
        version++;
        changes.push({ version, view });
        if (changes.length > KEPT) changes.shift();
        for (const listener of [...listeners]) listener();
    };
    const modelChanged = () => changed(null);
    const follow = () => {
        stopEngine?.();
        stopEngine = engine?.adapter.subscribe(changed);
    };
    return {
        version: () => version,
        changedSince(since, part) {
            if (since === version) return false;
            if (part === undefined || engine === null) return true;
            const oldest = changes[0];
            // a change it missed is no longer kept
            if (oldest === undefined || oldest.version > since + 1) return true;
            for (let index = changes.length - 1; index >= 0; index--) {
                const change = changes[index] as Change;
                if (change.version <= since) break;
                if (change.view === null) return true;
                if (engine.adapter.affects(change.view, part)) return true;
            }
            return false;
        },
        subscribe(listener) {
            listeners.add(listener);
            if (listeners.size === 1) {
                stopModel = model.subscribe(modelChanged);
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
            changed(null);
        },
    };
}
