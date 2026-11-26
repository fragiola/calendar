// A model's clock (D16), kept beside it in a module `WeakMap` (as its features are): the engine
// schedules the midnight refresh and the now indicator from the same clock the model reads "today"
// from, without a member on the model's surface.

const clocks = new WeakMap<object, () => number>();

/** Records a model's clock (`createCalendarModel`). */
export function registerClock(model: object, now: () => number): void {
    clocks.set(model, now);
}

/** A model's clock (`Date.now` for an object that is not a model). */
export function clockOf(model: object): () => number {
    return clocks.get(model) ?? Date.now;
}
