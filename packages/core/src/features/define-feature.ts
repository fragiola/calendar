import type { FeatureName } from "./keys";
import type { CalendarFeature } from "./types";

/**
 * Makes a feature from what it contributes (a feature's factory returns it), typed by its name and
 * its state slice: for feature authors. The core composes it when a model is created.
 */
export function defineFeature<
    const N extends FeatureName,
    S extends object = object,
>(spec: CalendarFeature<N, S>): CalendarFeature<N, S> {
    return Object.freeze(spec);
}
