// What each opt-in feature owns, by name only (Tree's table, fragiola/tree,
// packages/core/src/features/keys.ts): its commands, its `get` / `is` keys on the model and the
// engine, its document fields (top-level and an event's), the payload fields it adds to the core's
// commands, its settings, its root props and the engine events only its gestures emit. The core reads it to refuse what belongs to a feature
// that is not installed (a `not_found` result, a document issue naming the feature) and to type the
// verbs from the installed features; the code of a feature lives only in its own entry
// (`@fragiola/calendar/<feature>`), which nothing in the main entry imports. Each feature's Issue
// fills its row (D2: #4 recurrence, constraints, event sources; #5 the interactive ones, whose
// engine keys are here too).

/** Every feature's keys and fields. */
export const FEATURE_KEYS = Object.freeze({
    selection: {
        // a range set or cleared (the engine's pointer and keyboard selection runs them)
        commands: ["selection.set", "selection.clear"],
        get: ["selected-range"],
        is: [],
        engineRun: [],
        // the range a pointer or Shift + arrows is selecting, before it is set
        engineGet: ["selection-preview", "selection-segments"],
        engineIs: [],
        fields: [],
        eventFields: [],
        payloadFields: [],
        settings: [],
        rootProps: [],
        // the engine events only its gestures emit (an adapter types their callbacks by them)
        engineEvents: ["select"],
    },
    "drag-and-drop": {
        commands: [],
        get: [],
        is: [],
        engineRun: [],
        // the moved occurrence where it would land (D14), shared with `externalDrop()`
        engineGet: ["drag-preview"],
        engineIs: ["event-dragging", "event-grabbed"],
        fields: [],
        eventFields: [],
        payloadFields: [],
        settings: [],
        rootProps: [],
        // a drop (a move); `resize()` emits it too, for a resize
        engineEvents: ["drop"],
    },
    resize: {
        commands: [],
        get: [],
        is: [],
        engineRun: [],
        engineGet: ["resize-preview"],
        engineIs: ["event-resizing"],
        fields: [],
        eventFields: [],
        payloadFields: [],
        settings: [],
        rootProps: [],
        engineEvents: ["drop"],
    },
    recurrence: {
        // a rule set, changed or removed
        commands: ["event.set-recurrence"],
        get: ["occurrences-in"],
        is: ["event-recurring"],
        engineRun: [],
        engineGet: [],
        engineIs: [],
        fields: [],
        // an event's RRULE, exdates and overrides (D15)
        eventFields: ["recurrence"],
        // the edit scopes of `event.move`, `event.resize`, `event.update` and `event.remove`
        payloadFields: ["occurrenceId", "scope"],
        settings: [],
        rootProps: [],
        engineEvents: [],
    },
    "now-indicator": {
        commands: [],
        get: [],
        is: [],
        engineRun: [],
        // the current time's place in the time grid, from the model's clock
        engineGet: ["now-position"],
        engineIs: [],
        fields: [],
        eventFields: [],
        payloadFields: [],
        settings: [],
        rootProps: [],
        engineEvents: [],
    },
    constraints: {
        commands: [],
        get: ["business-hours-in"],
        is: [],
        engineRun: [],
        engineGet: [],
        engineIs: [],
        fields: [],
        eventFields: [],
        payloadFields: [],
        settings: [
            "businessHours",
            "eventConstraint",
            "selectConstraint",
            "overlap",
        ],
        rootProps: [],
        engineEvents: [],
    },
    "external-drop": {
        commands: [],
        get: [],
        is: [],
        // an app-driven pointer drag from outside the calendar (D14)
        engineRun: [
            "external-drag-start",
            "external-drag-move",
            "external-drag-end",
        ],
        engineGet: [],
        engineIs: [],
        fields: [],
        eventFields: [],
        payloadFields: [],
        settings: [],
        rootProps: [],
        engineEvents: ["external-drop"],
    },
    "event-sources": {
        commands: [
            "event-sources.receive",
            "event-sources.invalidate",
            "event-sources.set-loading",
        ],
        get: ["ranges-to-fetch", "event-source-by"],
        is: ["event-source-loading"],
        engineRun: [],
        engineGet: [],
        engineIs: [],
        fields: [],
        // the source an event came from
        eventFields: ["sourceId"],
        payloadFields: [],
        settings: ["eventSources"],
        rootProps: [],
        engineEvents: [],
    },
} as const);

/** The name of an opt-in feature (`@fragiola/calendar/<name>`). */
export type FeatureName = keyof typeof FEATURE_KEYS;

/** The kinds of names a feature owns. */
export type FeatureKeyKind = keyof (typeof FEATURE_KEYS)[FeatureName];

/** The names of kind `K` the features `N` own. */
export type OwnedBy<
    K extends FeatureKeyKind,
    N extends FeatureName = FeatureName,
> = N extends FeatureName ? (typeof FEATURE_KEYS)[N][K][number] : never;

const owners = new Map<string, FeatureName>();
for (const [name, keys] of Object.entries(FEATURE_KEYS) as [
    FeatureName,
    (typeof FEATURE_KEYS)[FeatureName],
][]) {
    for (const [kind, list] of Object.entries(keys)) {
        for (const key of list as readonly string[]) {
            if (!owners.has(`${kind}:${key}`)) {
                owners.set(`${kind}:${key}`, name);
            }
        }
    }
}

/** The feature that owns `key` of kind `kind`, if one does. */
export function ownerOf(
    kind: FeatureKeyKind,
    key: string,
): FeatureName | undefined {
    return owners.get(`${kind}:${key}`);
}

/** The features that emit an engine event (`drop`: drag and drop's moves, resize's resizes). */
export function emittersOf(type: string): FeatureName[] {
    return (
        Object.entries(FEATURE_KEYS) as [
            FeatureName,
            (typeof FEATURE_KEYS)[FeatureName],
        ][]
    ).flatMap(([name, keys]) =>
        (keys.engineEvents as readonly string[]).includes(type) ? [name] : [],
    );
}

/** The message of a key or field whose feature is not installed. */
export function requiresFeature(name: FeatureName): string {
    return `requires the ${name} feature (\`@fragiola/calendar/${name}\`)`;
}
