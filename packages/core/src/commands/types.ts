// The command catalogue's types: every command's payload and result, the bus's results, errors,
// middleware and events. Shapes from Tree (fragiola/tree, packages/core/src/commands/types.ts),
// same author and licence.
import type {
    CalendarEventInit,
    CalendarEventJson,
    CalendarInfoJson,
    CalendarSettingsJson,
    EventFlags,
    RecurrenceJson,
    ViewType,
} from "../document/calendar-document";
import type {
    CalendarEventOf,
    CalendarInfoOf,
} from "../document/calendar-event";
import type { CalendarSettings } from "../document/calendar-settings";
import type {
    AnyTypes,
    CalendarDataOf,
    CalendarTypes,
    DataField,
    EventDataOf,
    KindOf,
} from "../document/calendar-types";
import type { ValidationIssue } from "../document/validation-issue";
import type { JsonSchema } from "../schema/json-schema";
import type { CalendarState, ViewState } from "../state/calendar-state";
import type { PlainDate } from "../time/plain-date";

/** The payload of a command or a key that takes nothing: `{}`. */
export type NoPayload = Record<never, never>;

/**
 * Which occurrences of a recurring event an edit changes (D15; requires `recurrence()`): `this`
 * one, this one and the `following`, or `all` of them.
 */
export type EditScope = "this" | "following" | "all";

/**
 * The occurrence an edit is about (D15): its id, and the scope. The fields belong to
 * `recurrence()` (`@fragiola/calendar/recurrence`): without it, a payload naming them is
 * `not_found`.
 */
export interface OccurrenceTarget {
    occurrenceId?: string;
    scope?: EditScope;
}

/** The payload of `event.add`: a new event, its `end` optional (then the default duration). */
export type EventAddPayload<T extends CalendarTypes = AnyTypes> = {
    [K in KindOf<T>]: Omit<
        CalendarEventInit<K, EventDataOf<T, K>>,
        "end" | "data"
    > & { end?: string } & DataField<EventDataOf<T, K>>;
}[KindOf<T>];

/**
 * The payload of `event.update`: the fields to change; `null` removes an optional one
 * (`timeZone`, `calendarId`). `start` and `end` take the form of the event's `allDay` after the
 * change.
 */
export type EventUpdatePayload = {
    eventId: string;
    title?: string;
    start?: string;
    end?: string;
    allDay?: boolean;
    timeZone?: string | null;
    calendarId?: string | null;
} & OccurrenceTarget;

/** A move by a calendar delta (whole days, keeping the wall clock) and an instant delta (minutes). */
export interface MoveDelta {
    days?: number;
    minutes?: number;
}

/**
 * The payload of `event.move`: to a new `start` keeping the duration (a date onto the all-day
 * row, a date-time into the time grid; `allDay` says which, default the event's), or by a `delta`.
 */
export type EventMovePayload = (
    | { eventId: string; start: string; allDay?: boolean }
    | { eventId: string; delta: MoveDelta }
) &
    OccurrenceTarget;

/** The payload of `event.resize`: one edge to a new date (all-day) or date-time (timed). */
export type EventResizePayload = {
    eventId: string;
    edge: "start" | "end";
    to: string;
} & OccurrenceTarget;

/** The payload of `event.set-data`: the event's whole new data, of its kind (or a new kind). */
export type EventSetDataPayload<T extends CalendarTypes = AnyTypes> = {
    [K in KindOf<T>]: { eventId: string; kind?: K } & DataField<
        EventDataOf<T, K>
    >;
}[KindOf<T>];

/** A flag of `event.set-flags`: a value, or `null` to remove the event's own (the default applies). */
export type EventSetFlagsPayload = { eventId: string } & {
    [F in keyof EventFlags]?: boolean | null;
};

/** The payload of `calendar.update`: the fields to change; `null` removes `editable`. */
export type CalendarUpdatePayload<T extends CalendarTypes = AnyTypes> = {
    calendarId: string;
    title?: string;
    editable?: boolean | null;
    data?: CalendarDataOf<T>;
};

/**
 * A patch of the settings: each field replaces the setting; `null` removes an optional one
 * (`firstDayOfWeek`, `snapDuration`, `validRange`, the flag defaults, the features' settings) so
 * its default applies.
 */
export type SettingsPatch = {
    [K in keyof CalendarSettingsJson]?: K extends
        | "firstDayOfWeek"
        | "snapDuration"
        | "validRange"
        | "startEditable"
        | "durationEditable"
        | "deletable"
        | "businessHours"
        | "eventConstraint"
        | "selectConstraint"
        | "overlap"
        | "eventSources"
        ? CalendarSettingsJson[K] | null
        : CalendarSettingsJson[K];
};

/** A date as `view.go-to` takes it: `YYYY-MM-DD`, or a plain date object (D5). */
export type DateInput = string | PlainDate;

/** One command of a batch. */
export type BatchEntry<T extends CalendarTypes = AnyTypes> = {
    [C in CommandName]: { command: C; payload: PayloadOf<T, C> };
}[CommandName];

/** An event command's result: the event's id. */
interface EventIdResult {
    eventId: string;
}

/** Where an event is after a move or a resize. */
export interface EventTimesResult {
    eventId: string;
    start: string;
    end: string;
    allDay: boolean;
}

/** Every command: its payload and its result, typed by the registry `T`. */
export interface CommandMap<T extends CalendarTypes = AnyTypes> {
    "event.add": { payload: EventAddPayload<T>; result: EventIdResult };
    "event.update": { payload: EventUpdatePayload; result: EventIdResult };
    "event.move": { payload: EventMovePayload; result: EventTimesResult };
    "event.resize": { payload: EventResizePayload; result: EventTimesResult };
    "event.remove": {
        payload: { eventId: string } & OccurrenceTarget;
        result: EventIdResult;
    };
    "event.set-data": {
        payload: EventSetDataPayload<T>;
        result: EventIdResult;
    };
    "event.set-flags": {
        payload: EventSetFlagsPayload;
        result: EventIdResult;
    };
    "calendar.add": {
        payload: CalendarInfoJson<T>;
        result: { calendarId: string };
    };
    "calendar.update": {
        payload: CalendarUpdatePayload<T>;
        result: { calendarId: string };
    };
    "calendar.remove": {
        payload: { calendarId: string; events: "remove" | "keep" };
        result: { calendarId: string; removedEventIds: string[] };
    };
    "calendar.set-visible": {
        payload: { calendarId: string; visible: boolean };
        result: { calendarId: string };
    };
    "settings.set": {
        payload: { settings: SettingsPatch };
        result: { settings: CalendarSettingsJson };
    };
    "view.set": {
        payload: { type: ViewType; days?: number; duration?: number };
        result: { view: ViewResult };
    };
    "view.go-to": {
        payload: { date: DateInput };
        result: { view: ViewResult };
    };
    "view.next": { payload: NoPayload; result: { view: ViewResult } };
    "view.previous": { payload: NoPayload; result: { view: ViewResult } };
    "view.today": { payload: NoPayload; result: { view: ViewResult } };
    batch: {
        payload: { commands: BatchEntry<T>[] };
        result: { results: unknown[] };
    };
    /** `recurrence()`'s */
    "event.set-recurrence": {
        payload: { eventId: string; recurrence: RecurrenceJson | null };
        result: EventIdResult;
    };
    /** `selection()`'s */
    "selection.set": {
        payload: { start: string; end: string; allDay: boolean };
        result: { start: string; end: string; allDay: boolean };
    };
    /** `selection()`'s */
    "selection.clear": { payload: NoPayload; result: { cleared: boolean } };
    /** `eventSources()`'s */
    "event-sources.receive": {
        payload: {
            sourceId: string;
            range: DaysPayload;
            events: CalendarEventJson<T>[];
        };
        result: {
            sourceId: string;
            eventIds: string[];
            removedEventIds: string[];
        };
    };
    /** `eventSources()`'s */
    "event-sources.invalidate": {
        payload: { sourceId?: string; range?: DaysPayload };
        result: { sourceIds: string[] };
    };
    /** `eventSources()`'s */
    "event-sources.set-loading": {
        payload: { sourceId: string; range: DaysPayload; loading: boolean };
        result: { sourceId: string };
    };
}

/** A range of days in a payload: `YYYY-MM-DD`, `end` exclusive. */
export interface DaysPayload {
    start: string;
    end: string;
}

/** The view a `view.*` command leaves, as JSON. */
export interface ViewResult {
    type: ViewType;
    anchorDate: string;
    days?: number;
    duration?: number;
}

/** The name of a command. */
export type CommandName = keyof CommandMap;

/** The payload of command `C`. */
export type PayloadOf<
    T extends CalendarTypes,
    C extends CommandName,
> = CommandMap<T>[C]["payload"];

/** The result of command `C`. */
export type ResultOf<
    T extends CalendarTypes,
    C extends CommandName,
> = CommandMap<T>[C]["result"];

/** Why a command did not apply (`model-api.md`). */
export type CommandErrorCode =
    /** no command has this name */
    | "unknown_command"
    /** the payload does not match the command's schema, or is nonsense (an end before its start) */
    | "invalid_payload"
    /** an entity the payload names does not exist, or a name belongs to a feature not installed */
    | "not_found"
    /** a rule of the calendar forbids it (an edit flag, the valid range, …) */
    | "refused"
    /** a middleware vetoed it */
    | "vetoed"
    /** it was issued from a middleware and will run after the current command */
    | "queued"
    /** a middleware threw */
    | "middleware_error";

export interface CommandError {
    readonly code: CommandErrorCode;
    readonly message: string;
    /** a JSON pointer into the payload (or the dispatched input) */
    readonly path?: string;
    /** every schema problem, for `invalid_payload` */
    readonly issues?: readonly ValidationIssue[];
}

/** What a command returns: its value, or why it did not apply. It never throws on bad input. */
export type CommandResult<R> =
    | { readonly ok: true; readonly value: R }
    | { readonly ok: false; readonly error: CommandError };

/** Options of `run`. */
export interface RunOptions {
    /** a step of a continuous gesture: the event is marked so undo can merge it */
    transient?: boolean;
    /** free-form information for middleware and listeners (who asked, a drag's details, …) */
    meta?: Readonly<Record<string, unknown>>;
}

/** What a middleware's `ctx.get` reads: each key's payload and result, as on `model.get`. */
export interface CommandContextGetMap<T extends CalendarTypes = AnyTypes> {
    /** an event by its id */
    "event-by": {
        payload: { id: string };
        result: CalendarEventOf<T> | undefined;
    };
    /** a calendar by its id */
    "calendar-by": {
        payload: { id: string };
        result: CalendarInfoOf<T> | undefined;
    };
    /** the settings */
    settings: { payload: NoPayload; result: CalendarSettings };
    /** the view */
    view: { payload: NoPayload; result: ViewState };
}

/** What a middleware's `ctx.get` reads. */
export type CommandContextGetKey = keyof CommandContextGetMap;

/** What a middleware sees of any command. */
export interface CommandContextBase<T extends CalendarTypes = AnyTypes> {
    /** `model.can`/`model.check` (or a drag's hover): nothing will be committed; no side effects */
    readonly dryRun: boolean;
    readonly transient: boolean;
    /** true for a command running inside a batch (the batch itself also passes the chain) */
    readonly inBatch: boolean;
    readonly meta: Readonly<Record<string, unknown>> | undefined;
    /** the committed state the command applies to */
    readonly state: CalendarState<T>;
    /** reads as the command sees it: inside a batch, after its earlier commands */
    get<K extends CommandContextGetKey>(
        key: K,
        ...payload: CommandContextGetMap<T>[K]["payload"] extends NoPayload
            ? [payload?: CommandContextGetMap<T>[K]["payload"]]
            : [payload: CommandContextGetMap<T>[K]["payload"]]
    ): CommandContextGetMap<T>[K]["result"];
}

/**
 * What a middleware sees: a union discriminated by `command`, so checking the command narrows the
 * payload (`if (ctx.command === "event.move") ctx.payload.eventId`).
 */
export type CommandContext<T extends CalendarTypes = AnyTypes> = {
    [C in CommandName]: CommandContextBase<T> & {
        readonly command: C;
        /** the validated payload; assign a new object to rewrite it (it is validated again) */
        payload: PayloadOf<T, C>;
    };
}[CommandName];

/**
 * Runs around every command, engine-issued or not: veto (return an error without calling
 * `next`), rewrite (assign `ctx.payload`, then call `next`) or observe (call `next` and look at its
 * result). Returning `undefined` passes on `next`'s result when it was called. Written as a method
 * so a model of more features stays assignable to one of fewer (`features.md#typing`).
 */
export type Middleware<T extends CalendarTypes = AnyTypes> = {
    m(
        ctx: CommandContext<T>,
        next: () => CommandResult<unknown>,
    ): CommandResult<unknown> | undefined;
}["m"];

/** One command of a batch, as its event reports it. */
export interface BatchStep {
    readonly command: string;
    readonly payload: unknown;
    readonly result: unknown;
}

/** What a listener receives: one event per commit. */
export interface CommandEvent<T extends CalendarTypes = AnyTypes> {
    /** the command (a feature's too: a string) */
    readonly command: string;
    readonly payload: unknown;
    /** the command's value */
    readonly result: unknown;
    readonly before: CalendarState<T>;
    readonly after: CalendarState<T>;
    readonly transient: boolean;
    readonly meta: Readonly<Record<string, unknown>> | undefined;
    /** for a batch: the commands it ran, flattened */
    readonly commands?: readonly BatchStep[];
}

/** Listens to every commit. */
export type CommandListener<T extends CalendarTypes = AnyTypes> = (
    event: CommandEvent<T>,
) => void;

/** A command as `model.get("commands")` describes it: ready to become an AI tool definition. */
export interface CommandInfo {
    readonly name: string;
    readonly description: string;
    readonly payloadSchema: JsonSchema;
    readonly resultSchema: JsonSchema;
    /** whether it may run as a step of a continuous gesture */
    readonly transient: boolean;
}

/** The vetoed result a middleware returns to stop a command. */
export function veto(message = "vetoed by a middleware"): {
    readonly ok: false;
    readonly error: CommandError;
} {
    return { ok: false, error: { code: "vetoed", message } };
}
