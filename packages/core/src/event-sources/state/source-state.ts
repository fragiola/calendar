// The event sources' state slice: per source, the ranges of days received and those being
// fetched. Model state, not document (`calendar-json` writes the sources and their events, not
// what was fetched): a loaded document starts with nothing fetched.
import type { EventSource } from "../../document/calendar-document";
import type { FeatureState } from "../../features/types";
import type { DateRangeJson } from "../../state/queries";

/** What the model knows of one source. */
export interface SourceState {
    /** the ranges received, merged */
    readonly fetched: readonly DateRangeJson[];
    /** the ranges being fetched, merged */
    readonly loading: readonly DateRangeJson[];
}

/** The slice: each source's state by its id (a source with none has fetched nothing). */
export interface EventSourcesSlice {
    readonly eventSourceStates: Readonly<Record<string, SourceState>>;
}

const EMPTY: SourceState = Object.freeze({
    fetched: Object.freeze([]),
    loading: Object.freeze([]),
});

/** A source's state in a state. */
export function sourceStateOf(
    state: FeatureState,
    sourceId: string,
): SourceState {
    const states = state.eventSourceStates as
        | EventSourcesSlice["eventSourceStates"]
        | undefined;
    return (
        (states && Object.hasOwn(states, sourceId)
            ? states[sourceId]
            : undefined) ?? EMPTY
    );
}

/** The sources of a state's settings. */
export function sourcesOf(
    state: FeatureState,
): readonly Readonly<EventSource>[] {
    return state.settings.eventSources ?? [];
}

/** A source of the settings by id. */
export function sourceOf(
    state: FeatureState,
    sourceId: string,
): Readonly<EventSource> | undefined {
    return sourcesOf(state).find((source) => source.id === sourceId);
}
