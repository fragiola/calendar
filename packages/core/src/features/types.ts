// The contract of an opt-in feature (`architecture/features.md`): a plain object the app passes to
// `createCalendarModel` (or a root's `features` prop), made by a factory exported from the
// feature's own entry (`@fragiola/calendar/recurrence` → `recurrence()`). Every part is optional;
// the core composes them once, when the model is created (`registry.ts`). Features talk to each
// other only through keys. The engine's hook points (keys, presses, gestures) join with the engine
// (Issue #5).
import type {
    CommandDefinition,
    Failure,
    ReduceContext,
} from "../commands/define";
import type { CommandResult, EditScope } from "../commands/types";
import type { CalendarEvent } from "../document/calendar-event";
import type { AnyTypes, CalendarTypes } from "../document/calendar-types";
import type { ValidationIssue } from "../document/validation-issue";
import type { Occurrence, OccurrenceWindow } from "../layout/occurrence";
import type { CalendarState } from "../state/calendar-state";
import type { Draft, DraftState } from "../state/draft";
import type { FeatureName, OwnedBy } from "./keys";

export type { FeatureName } from "./keys";

/** A state as a feature sees it: the core's, with every installed feature's fields. */
export type FeatureState = DraftState;

/** A document as a feature reads it: it matched the document's JSON Schema. */
export type FeatureDocument = Readonly<Record<string, unknown>> & {
    readonly events: readonly Readonly<Record<string, unknown>>[];
    readonly settings?: Readonly<Record<string, unknown>>;
};

/** A feature's command: a definition of any command of `CommandMap`, its payload its own. */
export type FeatureCommand = Omit<CommandDefinition, "reduce"> & {
    readonly reduce: (
        payload: never,
        context: ReduceContext,
    ) => CommandResult<unknown>;
};

/** A part's attributes (D17): `data-*` and ARIA, `undefined` for an absent one. */
export type PartAttributes = Readonly<Record<string, string | undefined>>;

/** An edit of an event that may name one of its occurrences (D15). */
export interface EditRequest {
    readonly command:
        | "event.update"
        | "event.move"
        | "event.resize"
        | "event.remove";
    readonly event: CalendarEvent;
    readonly occurrenceId: string | undefined;
    readonly scope: EditScope | undefined;
}

/**
 * An edit the core computed (its rules checked, D9 and D10): the occurrence it started from and
 * the event as it would be (`null`: removed). A feature that owns the occurrence writes it its way
 * (an override, an exdate, a split series); the core writes `next` otherwise.
 */
export interface EditWrite extends EditRequest {
    /** the occurrence edited: the event's own without a feature taking it */
    readonly occurrence: Occurrence;
    /** the edited occurrence's fields, as an event (its id the event's) */
    readonly next: CalendarEvent | null;
}

/**
 * A change of an event the core is about to write: what the constraints of a feature may refuse.
 * For an edit of one occurrence of a recurring event, `after` is that occurrence's new fields as
 * an event (its id the event's, no `recurrence`).
 */
export interface EventChange {
    readonly command: string;
    /** the event before (`undefined`: added) */
    readonly before: CalendarEvent | undefined;
    /** the event after (`null`: removed) */
    readonly after: CalendarEvent | null;
    /** the occurrence an edit started from (its times before), for an edit of an existing event */
    readonly occurrence?: Occurrence;
}

/** A range of dates or times a selection covers (`selection()`, D2), end exclusive. */
export interface SelectionRange {
    /** a date when `allDay`, an RFC 3339 date-time otherwise */
    readonly start: string;
    readonly end: string;
    readonly allDay: boolean;
}

/**
 * What the core lends a feature's rules: reads that need the other features' contributions (every
 * event's occurrences, a recurring one's expanded by `recurrence()`), without importing them.
 */
export interface FeatureReads {
    /** every event's occurrences that may touch the window (calendars hidden or not), in event order */
    occurrences(within: OccurrenceWindow): readonly Occurrence[];
    /** one event's occurrences that may touch the window (one not in the state: an event added) */
    eventOccurrences(
        event: CalendarEvent,
        within: OccurrenceWindow,
    ): readonly Occurrence[];
}

/**
 * An opt-in feature: its state slice, document fields, commands, keys and contribution points.
 * `S` types its state slice on `model.state` (types only: a feature has no `~state` value).
 */
export interface CalendarFeature<
    N extends FeatureName = FeatureName,
    S extends object = object,
> {
    readonly name: N;
    /** features it needs installed too; a missing one fails `createCalendarModel`, naming both */
    readonly requires?: readonly FeatureName[];
    /** its settings and their defaults */
    readonly settings?: Readonly<Record<string, unknown>>;
    /**
     * the rules of its settings past the JSON Schema, on the settings in effect (the document's,
     * and `settings.set`'s once applied); `path` is the settings' pointer
     */
    settingsIssues?(
        settings: Readonly<Record<string, unknown>>,
        path: string,
    ): ValidationIssue[];
    /** the rules of its document fields past the JSON Schema (top-level fields) */
    issues?(
        json: FeatureDocument,
        at: (path: string) => string,
    ): ValidationIssue[];
    /**
     * the rules of its fields of one event past the JSON Schema (`recurrence`'s RRULE), in the
     * document and in `event.add` / `event.update`; `path` is the event's pointer
     */
    eventIssues?(
        event: Readonly<Record<string, unknown>>,
        path: string,
    ): ValidationIssue[];
    /** its state fields, from a valid document and the loaded core state */
    load?(
        json: FeatureDocument,
        state: CalendarState,
    ): Readonly<Record<string, unknown>>;
    /** its top-level document fields, from a state */
    toJson?(state: FeatureState): Record<string, unknown>;
    /** its commands, on the same bus as the core's (same middleware, results and codes) */
    readonly commands?: readonly FeatureCommand[];
    /** its `model.get` keys */
    readonly get?: {
        readonly [key: string]: (
            state: FeatureState,
            payload: never,
        ) => unknown;
    };
    /** its `model.is` keys */
    readonly is?: {
        readonly [key: string]: (
            state: FeatureState,
            payload: never,
        ) => boolean;
    };
    /**
     * an event's occurrences over a window (`recurrence()`'s expansion), or `undefined` to leave the
     * event to the core: the layout's contribution point (`layout/occurrence.ts`)
     */
    occurrences?(
        state: FeatureState,
        event: CalendarEvent,
        window: OccurrenceWindow,
    ): readonly Occurrence[] | undefined;
    /**
     * an occurrence by its id when the feature owns it (`get("occurrence-by")`): the occurrence,
     * `null` when the id is the feature's but names none (an excluded date, a recurring event's own
     * id), or `undefined` to leave the id to the core
     */
    occurrenceById?(
        state: FeatureState,
        occurrenceId: string,
    ): Occurrence | null | undefined;
    /**
     * the occurrence an edit starts from (a recurring event's, by `occurrenceId`), a failure (no
     * such occurrence, a scope missing), or `undefined` to leave it to the core (the event itself)
     */
    editTarget?(
        state: FeatureState,
        edit: EditRequest,
    ): Occurrence | Failure | undefined;
    /**
     * writes an edit the core computed, its own way, or `undefined` to let the core write `next`;
     * an object value is merged into the command's result (the id of an event it added)
     */
    writeEdit?(
        draft: Draft,
        edit: EditWrite,
    ): CommandResult<unknown> | undefined;
    /** a change of an event that its rules refuse (constraints), or `undefined` */
    checkEvent?(
        state: FeatureState,
        change: EventChange,
        reads: FeatureReads,
    ): Failure | undefined;
    /** a selected range that its rules refuse (`selectConstraint`), or `undefined` */
    checkSelection?(
        state: FeatureState,
        selection: SelectionRange,
        reads: FeatureReads,
    ): Failure | undefined;
    /** after every command, before it commits: its state kept to the core's (events removed, …) */
    stateChanged?(draft: Draft, before: FeatureState): void;
    /** the attributes a day (`YYYY-MM-DD`) gets, from the state alone */
    dayAttributes?(
        state: FeatureState,
        date: string,
    ): PartAttributes | undefined;
    /** the attributes a time-grid slot (a date, an `HH:mm` time) gets, from the state alone */
    slotAttributes?(
        state: FeatureState,
        date: string,
        time: string,
    ): PartAttributes | undefined;
    /** the attributes an occurrence's element gets, from the state alone */
    eventAttributes?(
        state: FeatureState,
        occurrence: Occurrence,
    ): PartAttributes | undefined;
    /** the attributes the root gets, from the state alone */
    rootAttributes?(state: FeatureState): PartAttributes | undefined;
    /** the state slice's type, for `model.state` (never set) */
    readonly "~state"?: S;
}

/** Any feature. */
export type AnyCalendarFeature = CalendarFeature<FeatureName, object>;

/** A list of features, as `createCalendarModel` takes it. */
export type CalendarFeatures = readonly AnyCalendarFeature[];

/**
 * Whether a list's features are not known: a list typed `CalendarFeatures` (what a function taking
 * any model is written with). A tuple of known features, `[]` included, is not.
 */
export type AnyFeatures<F extends CalendarFeatures> = number extends F["length"]
    ? true
    : false;

/** The names of the features of a list (none for a list of unknown features). */
export type FeatureNamesOf<F extends CalendarFeatures> =
    AnyFeatures<F> extends true ? never : F[number]["name"];

/** A feature's state slice (`unknown` for none). */
type SliceOf<X> =
    X extends CalendarFeature<FeatureName, infer S>
        ? keyof S extends never
            ? unknown
            : S
        : unknown;

/**
 * The state slices of a tuple of features, merged one by one (unknown for none, and for a list of
 * unknown features). A walk of the tuple, not a union turned intersection: that would compare `F`
 * contravariantly, and a model with features would not be a model of any features.
 */
type MergedState<F extends readonly unknown[]> = F extends readonly [
    infer Head,
    ...infer Rest,
]
    ? SliceOf<Head> & MergedState<Rest>
    : unknown;

/**
 * What a list of features adds to the model, read through an interface's member (Data Grid's
 * `FeatureKeys`): TypeScript then compares models member by member, so a model with features is
 * assignable to one of any features.
 */
export interface FeatureKeys<F extends CalendarFeatures> {
    readonly state: MergedState<F>;
}

/** The state slices of a list of features, merged. */
export type FeatureStateOf<F extends CalendarFeatures> =
    FeatureKeys<F>["state"];

/** The state of a model with the features `F`. */
export type CalendarStateOf<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = readonly [],
> = CalendarState<T> & FeatureStateOf<F>;

type Allowed<
    Kind extends "commands" | "get" | "is",
    All extends string,
    F extends CalendarFeatures,
> =
    | Exclude<All, OwnedBy<Kind>>
    | Extract<All, OwnedBy<Kind, FeatureNamesOf<F>>>;

/** The commands a model with the features `F` runs: the core's and theirs. */
export type CommandNameOf<
    F extends CalendarFeatures,
    All extends string,
> = Allowed<"commands", All, F>;

/** The `model.get` keys of a model with the features `F`. */
export type ModelGetKeyOf<
    F extends CalendarFeatures,
    All extends string,
> = Allowed<"get", All, F>;

/** The `model.is` keys of a model with the features `F`. */
export type ModelIsKeyOf<
    F extends CalendarFeatures,
    All extends string,
> = Allowed<"is", All, F>;

/** An installed feature as `model.get("features")` lists it. */
export interface CalendarFeatureInfo {
    readonly name: FeatureName;
    readonly requires: readonly FeatureName[];
}
