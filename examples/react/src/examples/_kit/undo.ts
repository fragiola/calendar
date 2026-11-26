// Undo/redo for a calendar model, as app code: the package ships none, so what counts as a step is
// the app's (here: a change of the events; not the view, the selection or the settings). Copy this
// file and change it freely.
import type {
    AnyTypes,
    CalendarEventJson,
    CalendarFeatures,
    CalendarModel,
    CalendarTypes,
    CommandEvent,
} from "@fragiola/calendar-react";

/** `meta` of the `event.set-all` an undo or a redo runs, so it is not recorded as a step. */
const UNDO_META = { undo: true } as const;

/** A step of the history: the command that made it, for a label ("Undo event.move"). */
export interface UndoStep {
    readonly command: string;
}

/** The state of an {@link UndoManager}: the same object until something changes. */
export interface UndoSnapshot {
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    /** the steps undo goes back through, oldest first (the last one is undone next) */
    readonly undoSteps: readonly UndoStep[];
    /** the steps redo goes forward through, the next one last */
    readonly redoSteps: readonly UndoStep[];
}

type Events<T extends CalendarTypes> = CalendarModel<T>["state"]["events"];

interface Entry<T extends CalendarTypes> {
    readonly step: UndoStep;
    readonly events: Events<T>;
}

/**
 * Undo/redo over the command bus: each commit that changes the events keeps the list before it, and
 * undo and redo put a list back with `event.set-all` (an event the model still holds keeps its
 * object). A drag is one step: the engine runs one command on its drop.
 *
 * ```ts
 * const undo = new UndoManager(model);
 * model.run("event.remove", { eventId: "lunch" });
 * undo.undo();
 * ```
 */
export class UndoManager<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
> {
    private readonly model: CalendarModel<T, F>;
    private undoBuffer: Entry<T>[] = [];
    private redoBuffer: Entry<T>[] = [];
    private readonly listeners = new Set<() => void>();
    private snapshot: UndoSnapshot;

    constructor(model: CalendarModel<T, F>) {
        this.model = model;
        this.snapshot = this.createSnapshot();
        (model as unknown as CalendarModel<T>).subscribe(this.onCommit);
    }

    undo() {
        this.swap(this.undoBuffer, this.redoBuffer);
    }

    redo() {
        this.swap(this.redoBuffer, this.undoBuffer);
    }

    /** The current state, the same object until it changes (bound, for `useSyncExternalStore`). */
    getSnapshot = (): UndoSnapshot => this.snapshot;

    /** Calls `listener` whenever the snapshot changes; returns its remover (bound). */
    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    private readonly onCommit = (event: CommandEvent<T>) => {
        if (event.meta?.undo === true || event.transient) return;
        // a step is a change of the events: an event command, or a batch of them
        if (event.before.events === event.after.events) return;
        this.undoBuffer.push({
            step: { command: event.command },
            events: event.before.events,
        });
        this.redoBuffer = [];
        this.changed();
    };

    private swap(from: Entry<T>[], to: Entry<T>[]) {
        const entry = from.pop();
        if (!entry) return;
        const model = this.model as unknown as CalendarModel<T>;
        to.push({ step: entry.step, events: model.state.events });
        model.run(
            "event.set-all",
            // the model's own event objects: `event.set-all` keeps each one as it is
            { events: [...entry.events] as unknown as CalendarEventJson<T>[] },
            { meta: UNDO_META },
        );
        this.changed();
    }

    private changed() {
        this.snapshot = this.createSnapshot();
        for (const listener of [...this.listeners]) listener();
    }

    private createSnapshot(): UndoSnapshot {
        return {
            canUndo: this.undoBuffer.length > 0,
            canRedo: this.redoBuffer.length > 0,
            undoSteps: this.undoBuffer.map((entry) => entry.step),
            redoSteps: this.redoBuffer.map((entry) => entry.step),
        };
    }
}
