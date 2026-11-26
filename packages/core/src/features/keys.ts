// What each opt-in feature owns, by name only (Tree's table, fragiola/tree,
// packages/core/src/features/keys.ts): its commands, its `get` / `is` keys on the model and the
// engine, its document fields (top-level and an event's), the payload fields it adds to the core's
// commands, its settings and its root props. The core reads it to refuse what belongs to a feature
// that is not installed (a `not_found` result, a document issue naming the feature) and to type the
// verbs from the installed features; the code of a feature lives only in its own entry
// (`@fragiola/calendar/<feature>`), which nothing in the main entry imports. Each feature's Issue
// fills its row (D2: #4 recurrence, constraints, event sources; #5 the interactive ones).

/** Every feature's keys and fields. */
export const FEATURE_KEYS = Object.freeze({
    selection: {
        commands: [],
        get: [],
        is: [],
        engineRun: [],
        engineGet: [],
        engineIs: [],
        fields: [],
        eventFields: [],
        payloadFields: [],
        settings: [],
        rootProps: [],
    },
    "drag-and-drop": {
        commands: [],
        get: [],
        is: [],
        engineRun: [],
        engineGet: [],
        engineIs: [],
        fields: [],
        eventFields: [],
        payloadFields: [],
        settings: [],
        rootProps: [],
    },
    resize: {
        commands: [],
        get: [],
        is: [],
        engineRun: [],
        engineGet: [],
        engineIs: [],
        fields: [],
        eventFields: [],
        payloadFields: [],
        settings: [],
        rootProps: [],
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
    },
    "now-indicator": {
        commands: [],
        get: [],
        is: [],
        engineRun: [],
        engineGet: [],
        engineIs: [],
        fields: [],
        eventFields: [],
        payloadFields: [],
        settings: [],
        rootProps: [],
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
    },
    "external-drop": {
        commands: [],
        get: [],
        is: [],
        engineRun: [],
        engineGet: [],
        engineIs: [],
        fields: [],
        eventFields: [],
        payloadFields: [],
        settings: [],
        rootProps: [],
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

/** The message of a key or field whose feature is not installed. */
export function requiresFeature(name: FeatureName): string {
    return `requires the ${name} feature (\`@fragiola/calendar/${name}\`)`;
}
