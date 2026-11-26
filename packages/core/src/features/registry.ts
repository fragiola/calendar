// Composes a model's features once, when it is created: one function per contribution point, so
// nothing is looked up or allocated per event on a hot path, and a point no feature fills is
// `undefined` (the core does its own work, nothing more). Shaped like Data Grid's
// (fragiola/data-grid, packages/core/src/feature/registry.ts) and Tree's (the names table, the
// document hooks), same author and licence. The engine finds its model's composition through
// `featuresOf(model)`, never through the model's public surface.
import type { CommandDefinition, Failure } from "../commands/define";
import type { CommandResult } from "../commands/types";
import type { CalendarEvent } from "../document/calendar-event";
import type { ValidationIssue } from "../document/validation-issue";
import {
    eventOccurrences,
    type Occurrence,
    type OccurrenceWindow,
    occurrencesOf,
} from "../layout/occurrence";
import type { CalendarState } from "../state/calendar-state";
import type { Draft } from "../state/draft";
import { type FeatureKeyKind, type FeatureName, ownerOf } from "./keys";
import type {
    AnyCalendarFeature,
    CalendarFeatureInfo,
    EditRequest,
    EditWrite,
    EventChange,
    FeatureDocument,
    FeatureReads,
    FeatureState,
    PartAttributes,
    SelectionRange,
} from "./types";

/** A model's features, composed. */
export interface ComposedFeatures {
    readonly list: readonly AnyCalendarFeature[];
    readonly info: readonly CalendarFeatureInfo[];
    /** the installed features' settings, with their defaults */
    readonly settings: Readonly<Record<string, unknown>>;
    /** the installed features' commands, by name */
    readonly commands: ReadonlyMap<string, CommandDefinition>;
    readonly getters: ReadonlyMap<
        string,
        (state: FeatureState, payload: unknown) => unknown
    >;
    readonly questions: ReadonlyMap<
        string,
        (state: FeatureState, payload: unknown) => boolean
    >;
    /** the feature that owns `key` of kind `kind` when it is not installed */
    missing(kind: FeatureKeyKind, key: string): FeatureName | undefined;
    issues(
        json: FeatureDocument,
        at: (path: string) => string,
    ): ValidationIssue[];
    eventIssues(
        event: Readonly<Record<string, unknown>>,
        path: string,
    ): ValidationIssue[];
    settingsIssues(
        settings: Readonly<Record<string, unknown>>,
        path: string,
    ): ValidationIssue[];
    load(json: FeatureDocument, state: CalendarState): Record<string, unknown>;
    toJson(state: FeatureState): Record<string, unknown>;
    /** the occurrences contribution point: `undefined` without a feature filling it */
    readonly occurrences:
        | ((
              state: FeatureState,
              event: CalendarEvent,
              within: OccurrenceWindow,
          ) => readonly Occurrence[] | undefined)
        | undefined;
    /** an occurrence a feature owns by its id (`null`: the feature's id, no occurrence) */
    occurrenceById(
        state: FeatureState,
        occurrenceId: string,
    ): Occurrence | null | undefined;
    /** the reads lent to the features' rules, for a state */
    reads(state: FeatureState): FeatureReads;
    /** the occurrence an edit starts from: `undefined` (the event's own) without a feature */
    editTarget(
        state: FeatureState,
        edit: EditRequest,
    ): Occurrence | Failure | undefined;
    /** writes an edit a feature owns, or `undefined` for the core to write */
    writeEdit(
        draft: Draft,
        edit: EditWrite,
    ): CommandResult<unknown> | undefined;
    /** the first refusal of an event change by a feature's rules */
    checkEvent(state: FeatureState, change: EventChange): Failure | undefined;
    /** the first refusal of a selected range by a feature's rules */
    checkSelection(
        state: FeatureState,
        selection: SelectionRange,
    ): Failure | undefined;
    stateChanged(draft: Draft, before: FeatureState): void;
    dayAttributes(
        state: FeatureState,
        date: string,
    ): PartAttributes | undefined;
    eventAttributes(
        state: FeatureState,
        occurrence: Occurrence,
    ): PartAttributes | undefined;
    slotAttributes(
        state: FeatureState,
        date: string,
        time: string,
    ): PartAttributes | undefined;
    rootAttributes(state: FeatureState): PartAttributes | undefined;
}

/** Merges the attributes of each contribution (one alone is returned as it is). */
function mergeAttributes(
    all: readonly (PartAttributes | undefined)[],
): PartAttributes | undefined {
    let only: PartAttributes | undefined;
    let merged: Record<string, string | undefined> | undefined;
    for (const attributes of all) {
        if (!attributes) continue;
        if (only === undefined) only = attributes;
        else merged = { ...(merged ?? only), ...attributes };
    }
    return merged ?? only;
}

/** A feature's keys of one kind into the model's: a key two features add throws. */
function collect<V>(
    feature: AnyCalendarFeature,
    kind: string,
    entries: Iterable<readonly [string, V]>,
    into: Map<string, V>,
): void {
    for (const [key, value] of entries) {
        if (into.has(key)) {
            throw new TypeError(
                `feature "${feature.name}" adds ${kind} "${key}", which another feature adds`,
            );
        }
        into.set(key, value);
    }
}

/**
 * Composes a list of features: each name once, every requirement installed (else it throws, naming
 * both), each key added once. The list's order stays free.
 */
export function composeFeatures(
    list: readonly AnyCalendarFeature[] = [],
): ComposedFeatures {
    const installed = new Set<FeatureName>();
    for (const feature of list) {
        if (installed.has(feature.name)) {
            throw new TypeError(
                `feature "${feature.name}" is installed twice: install it once`,
            );
        }
        installed.add(feature.name);
    }
    for (const feature of list) {
        for (const required of feature.requires ?? []) {
            if (!installed.has(required)) {
                throw new TypeError(
                    `feature "${feature.name}" requires feature "${required}": install it too`,
                );
            }
        }
    }
    const commands = new Map<string, CommandDefinition>();
    const getters = new Map<
        string,
        (state: FeatureState, payload: unknown) => unknown
    >();
    const questions = new Map<
        string,
        (state: FeatureState, payload: unknown) => boolean
    >();
    let settings: Record<string, unknown> = {};
    for (const feature of list) {
        collect(
            feature,
            "command",
            (feature.commands ?? []).map(
                (command) =>
                    [command.name, command as CommandDefinition] as const,
            ),
            commands,
        );
        collect(
            feature,
            "get key",
            Object.entries(feature.get ?? {}) as [
                string,
                (state: FeatureState, payload: unknown) => unknown,
            ][],
            getters,
        );
        collect(
            feature,
            "is key",
            Object.entries(feature.is ?? {}) as [
                string,
                (state: FeatureState, payload: unknown) => boolean,
            ][],
            questions,
        );
        settings = { ...settings, ...feature.settings };
    }
    const each = <K extends keyof AnyCalendarFeature>(key: K) =>
        list.filter((feature) => feature[key] !== undefined);
    const issuers = each("issues");
    const eventIssuers = each("eventIssues");
    const settingsIssuers = each("settingsIssues");
    const finders = each("occurrenceById");
    const selectionCheckers = each("checkSelection");
    const slots = each("slotAttributes");
    const loaders = each("load");
    const writers = each("toJson");
    const contributors = each("occurrences");
    const targets = each("editTarget");
    const editors = each("writeEdit");
    const checkers = each("checkEvent");
    const settlers = each("stateChanged");
    const days = each("dayAttributes");
    const events = each("eventAttributes");
    const roots = each("rootAttributes");
    const contribute = (
        state: FeatureState,
        event: CalendarEvent,
        within: OccurrenceWindow,
    ): readonly Occurrence[] | undefined => {
        for (const feature of contributors) {
            const occurrences = feature.occurrences?.(state, event, within);
            if (occurrences !== undefined) return occurrences;
        }
        return undefined;
    };
    const reads = (state: FeatureState): FeatureReads => ({
        occurrences: (within) =>
            occurrencesOf(
                state.events,
                within,
                contributors.length === 0
                    ? undefined
                    : (event, at) => contribute(state, event, at),
            ),
        eventOccurrences: (event, within) =>
            contribute(state, event, within) ?? eventOccurrences(event),
    });

    return Object.freeze({
        list: Object.freeze([...list]),
        info: Object.freeze(
            list.map((feature) =>
                Object.freeze({
                    name: feature.name,
                    requires: Object.freeze([...(feature.requires ?? [])]),
                }),
            ),
        ),
        settings: Object.freeze(settings),
        commands,
        getters,
        questions,
        missing: (kind, key) => {
            const owner = ownerOf(kind, key);
            return owner !== undefined && !installed.has(owner)
                ? owner
                : undefined;
        },
        issues: (json, at) =>
            issuers.flatMap((feature) => feature.issues?.(json, at) ?? []),
        eventIssues: (event, path) =>
            eventIssuers.flatMap(
                (feature) => feature.eventIssues?.(event, path) ?? [],
            ),
        load: (json, state) =>
            Object.assign(
                {},
                ...loaders.map((feature) => feature.load?.(json, state)),
            ),
        toJson: (state) =>
            Object.assign(
                {},
                ...writers.map((feature) => feature.toJson?.(state)),
            ),
        settingsIssues: (settings, path) =>
            settingsIssuers.flatMap(
                (feature) => feature.settingsIssues?.(settings, path) ?? [],
            ),
        occurrences: contributors.length === 0 ? undefined : contribute,
        occurrenceById: (state, occurrenceId) => {
            for (const feature of finders) {
                const found = feature.occurrenceById?.(state, occurrenceId);
                if (found !== undefined) return found;
            }
            return undefined;
        },
        reads,
        editTarget: (state, edit) => {
            for (const feature of targets) {
                const target = feature.editTarget?.(state, edit);
                if (target !== undefined) return target;
            }
            return undefined;
        },
        writeEdit: (draft, edit) => {
            for (const feature of editors) {
                const result = feature.writeEdit?.(draft, edit);
                if (result !== undefined) return result;
            }
            return undefined;
        },
        checkEvent: (state, change) => {
            if (checkers.length === 0) return undefined;
            const lent = reads(state);
            for (const feature of checkers) {
                const refusal = feature.checkEvent?.(state, change, lent);
                if (refusal !== undefined) return refusal;
            }
            return undefined;
        },
        checkSelection: (state, selection) => {
            if (selectionCheckers.length === 0) return undefined;
            const lent = reads(state);
            for (const feature of selectionCheckers) {
                const refusal = feature.checkSelection?.(
                    state,
                    selection,
                    lent,
                );
                if (refusal !== undefined) return refusal;
            }
            return undefined;
        },
        stateChanged: (draft, before) => {
            for (const feature of settlers) {
                feature.stateChanged?.(draft, before);
            }
        },
        dayAttributes: (state, date) =>
            days.length === 0
                ? undefined
                : mergeAttributes(
                      days.map((feature) =>
                          feature.dayAttributes?.(state, date),
                      ),
                  ),
        eventAttributes: (state, occurrence) =>
            events.length === 0
                ? undefined
                : mergeAttributes(
                      events.map((feature) =>
                          feature.eventAttributes?.(state, occurrence),
                      ),
                  ),
        slotAttributes: (state, date, time) =>
            slots.length === 0
                ? undefined
                : mergeAttributes(
                      slots.map((feature) =>
                          feature.slotAttributes?.(state, date, time),
                      ),
                  ),
        rootAttributes: (state) =>
            roots.length === 0
                ? undefined
                : mergeAttributes(
                      roots.map((feature) => feature.rootAttributes?.(state)),
                  ),
    } satisfies ComposedFeatures);
}

/** No feature: a bare calendar. */
export const NO_FEATURES: ComposedFeatures = composeFeatures([]);

const byModel = new WeakMap<object, ComposedFeatures>();

/** Records a model's composed features (`createCalendarModel`). */
export function registerFeatures(
    model: object,
    features: ComposedFeatures,
): void {
    byModel.set(model, features);
}

/** A model's composed features (a bare calendar's for an object that is not a model). */
export function featuresOf(model: object): ComposedFeatures {
    return byModel.get(model) ?? NO_FEATURES;
}
