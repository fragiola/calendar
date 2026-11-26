// The calendar model and its command bus (`architecture/model-api.md`). From Tree
// (fragiola/tree, packages/core/src/state/model.ts), same author and licence; the calendar adds the
// injected clock (D16) and refuses a payload field of a feature that is not installed (D15's
// `occurrenceId` / `scope`).
import { COMMAND_DEFINITIONS } from "../commands/catalogue";
import {
    type CommandDefinition,
    fail,
    invalid,
    type ReduceContext,
} from "../commands/define";
import type {
    BatchStep,
    CommandContext,
    CommandContextGetKey,
    CommandEvent,
    CommandListener,
    CommandName,
    CommandResult,
    Middleware,
    PayloadOf,
    ResultOf,
    RunOptions,
} from "../commands/types";
import type { CalendarDocument } from "../document/calendar-document";
import type { AnyTypes, CalendarTypes } from "../document/calendar-types";
import { CalendarValidationError } from "../document/calendar-validation-error";
import { type CreateId, IdSource } from "../document/id-source";
import { loadDocument } from "../document/load-document";
import { requiresFeature } from "../features/keys";
import {
    type ComposedFeatures,
    composeFeatures,
    registerFeatures,
} from "../features/registry";
import type {
    CalendarFeatures,
    CalendarStateOf,
    CommandNameOf,
    ModelGetKeyOf,
    ModelIsKeyOf,
} from "../features/types";
import { isObject, validate } from "../schema/validator";
import type { CalendarState } from "../state/calendar-state";
import { Draft, type DraftState } from "../state/draft";
import {
    createQueries,
    type ModelGetKey,
    type ModelGetPayload,
    type ModelGetResult,
    type ModelIsKey,
    type ModelIsPayload,
    type Queries,
    type QueryArgs,
} from "../state/queries";

/** Options of {@link createCalendarModel}. */
export interface CalendarModelOptions<
    F extends CalendarFeatures = readonly [],
> {
    /**
     * the opt-in features (`[recurrence()]`), each from its own entry (`@fragiola/calendar/<feature>`):
     * fixed for the model's life. Without them, a minimal calendar
     */
    features?: F | undefined;
    /** generates the id of an event or a calendar given without one; default `` `event-${n}` `` */
    createId?: CreateId | undefined;
    /** the clock, epoch milliseconds (D16): "today", `past`, the default anchor, `view.today`; default `Date.now` */
    now?: (() => number) | undefined;
}

/**
 * What the app adds to a dispatched command: never read from the untrusted input, so `meta` can
 * say who asked (`{ source: "assistant" }`) for middleware to decide on.
 */
export interface DispatchOptions {
    meta?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * The calendar model: the calendar's data, its view and its rules. An immutable state that only
 * commands change, usable in plain Node (no DOM). Every member is one verb (D20):
 *
 * - `run` changes the calendar (a command, through the middleware chain); `dispatch` is `run` for
 *   untrusted JSON;
 * - `can` answers whether `run` would succeed; `check` returns what it would return;
 * - `get` reads (`model.get("day-grid")`); `is` asks a yes/no question
 *   (`model.is("event-editable", { eventId })`);
 * - `use` adds a middleware around every command; `subscribe` listens to every commit.
 *
 * Every method is bound. `F` defaults to any features (`CalendarFeatures`): every model is
 * assignable to `CalendarModel<T>`, whose verbs check the core's keys.
 */
export interface CalendarModel<
    T extends CalendarTypes = AnyTypes,
    F extends CalendarFeatures = CalendarFeatures,
> {
    /** the current state (immutable; a new object after every change), with the features' fields */
    readonly state: CalendarStateOf<T, F>;
    /**
     * changes the calendar: runs a command (typed) through the middleware chain; never throws on
     * bad input. A command of a feature that is not installed returns `not_found`
     */
    run<C extends CommandNameOf<F, CommandName>>(
        command: C,
        payload: PayloadOf<T, C>,
        options?: RunOptions,
    ): CommandResult<ResultOf<T, C>>;
    /**
     * `run` for a command given as untrusted JSON `{ command, payload, transient? }`, validated;
     * `options.meta` (the app's, not the input's) reaches middleware and listeners
     */
    dispatch(input: unknown, options?: DispatchOptions): CommandResult<unknown>;
    /** whether `run` would succeed now (nothing is committed or emitted) */
    can<C extends CommandNameOf<F, CommandName>>(
        command: C,
        payload: PayloadOf<T, C>,
        options?: RunOptions,
    ): boolean;
    /** what `run` would return (its value, or why it is refused), without committing or emitting */
    check<C extends CommandNameOf<F, CommandName>>(
        command: C,
        payload: PayloadOf<T, C>,
        options?: RunOptions,
    ): CommandResult<ResultOf<T, C>>;
    /** reads from the current state: an event, the view's ranges, a layout, the JSON, … */
    get<K extends ModelGetKeyOf<F, ModelGetKey>>(
        key: K,
        ...payload: QueryArgs<ModelGetPayload<T, K>>
    ): ModelGetResult<T, K>;
    /** asks a yes/no question about the current state */
    is<K extends ModelIsKeyOf<F, ModelIsKey>>(
        key: K,
        ...payload: QueryArgs<ModelIsPayload<K>>
    ): boolean;
    /** adds a middleware around every command (the first added runs outermost); returns its remover */
    use(middleware: Middleware<T>): () => void;
    /** listens to every committed command (one event per commit); returns its remover */
    subscribe(listener: CommandListener<T>): () => void;
}

function prefixed(
    result: CommandResult<unknown>,
    prefix: string,
): CommandResult<unknown> {
    if (result.ok || prefix === "") {
        return result;
    }
    const { error: failure } = result;
    return {
        ok: false,
        error: {
            ...failure,
            ...(failure.path !== undefined
                ? { path: `${prefix}${failure.path}` }
                : {}),
            ...(failure.issues
                ? {
                      issues: failure.issues.map((issue) => ({
                          path: `${prefix}${issue.path}`,
                          message: issue.message,
                      })),
                  }
                : {}),
        },
    };
}

/** Where a command's errors point: into its payload, and at its transient flag. */
interface ErrorPaths {
    readonly payload: string;
    readonly transient: string;
}

/** One top-level execution: the draft it runs on, and what it collects (the steps of a batch). */
interface Execution {
    readonly draft: Draft;
    readonly dryRun: boolean;
    readonly options: RunOptions;
    readonly steps: BatchStep[];
    /** an exception a reducer threw: rethrown once the chain unwound */
    thrown: { error: unknown } | undefined;
}

class Model<T extends CalendarTypes, F extends CalendarFeatures>
    implements CalendarModel<T, F>
{
    /** the committed state: what queries read and commands start from */
    private committed: DraftState;
    private readonly features: ComposedFeatures;
    private readonly queries: Queries;
    private readonly ids: IdSource;
    private readonly now: () => number;
    private readonly middleware: Middleware<T>[] = [];
    private readonly listeners = new Set<CommandListener<T>>();
    private inFlight = 0;
    /** dry runs under way (`can`, `check`): a command a middleware issues then is one too */
    private dryRuns = 0;
    private readonly queue: (() => void)[] = [];
    private readonly events: CommandEvent<T>[] = [];
    private delivering = false;

    constructor(
        state: CalendarState,
        ids: IdSource,
        now: () => number,
        features: ComposedFeatures,
    ) {
        this.committed = state as DraftState;
        this.ids = ids;
        this.now = now;
        this.features = features;
        this.queries = createQueries(features, now);
        // the bus can be passed around detached: `const { run } = model`
        this.run = this.run.bind(this);
        this.dispatch = this.dispatch.bind(this);
        this.can = this.can.bind(this);
        this.check = this.check.bind(this);
        this.get = this.get.bind(this);
        this.is = this.is.bind(this);
        this.use = this.use.bind(this);
        this.subscribe = this.subscribe.bind(this);
    }

    get state(): CalendarStateOf<T, F> {
        return this.committed as unknown as CalendarStateOf<T, F>;
    }

    get<K extends ModelGetKeyOf<F, ModelGetKey>>(
        key: K,
        ...payload: QueryArgs<ModelGetPayload<T, K>>
    ): ModelGetResult<T, K> {
        return this.queries.get(
            this.committed,
            key,
            payload[0],
        ) as ModelGetResult<T, K>;
    }

    is<K extends ModelIsKeyOf<F, ModelIsKey>>(
        key: K,
        ...payload: QueryArgs<ModelIsPayload<K>>
    ): boolean {
        return this.queries.is(this.committed, key, payload[0]);
    }

    /** A command by name: the core's or an installed feature's. */
    private definition(command: string): CommandDefinition | undefined {
        return (
            COMMAND_DEFINITIONS.get(command) ??
            this.features.commands.get(command)
        );
    }

    /** The failure of a name that is no command here: a missing feature's, or unknown. */
    private unknown(command: string, path?: string): CommandResult<never> {
        const owner = this.features.missing("commands", command);
        return owner !== undefined
            ? fail("not_found", `"${command}" ${requiresFeature(owner)}`, path)
            : fail("unknown_command", `unknown command "${command}"`, path);
    }

    use(middleware: Middleware<T>): () => void {
        this.middleware.push(middleware);
        return () => {
            const at = this.middleware.indexOf(middleware);
            if (at >= 0) {
                this.middleware.splice(at, 1);
            }
        };
    }

    subscribe(listener: CommandListener<T>): () => void {
        const wrapper: CommandListener<T> = (event) => listener(event);
        this.listeners.add(wrapper);
        return () => {
            this.listeners.delete(wrapper);
        };
    }

    run<C extends CommandNameOf<F, CommandName>>(
        command: C,
        payload: PayloadOf<T, C>,
        options?: RunOptions,
    ): CommandResult<ResultOf<T, C>> {
        return this.enqueueOrExecute(
            command,
            payload,
            options,
            "",
        ) as CommandResult<ResultOf<T, C>>;
    }

    can<C extends CommandNameOf<F, CommandName>>(
        command: C,
        payload: PayloadOf<T, C>,
        options?: RunOptions,
    ): boolean {
        return this.check(command, payload, options).ok;
    }

    check<C extends CommandNameOf<F, CommandName>>(
        command: C,
        payload: PayloadOf<T, C>,
        options?: RunOptions,
    ): CommandResult<ResultOf<T, C>> {
        return this.execute(
            command,
            payload,
            options ?? {},
            true,
            "",
        ) as CommandResult<ResultOf<T, C>>;
    }

    dispatch(
        input: unknown,
        options: DispatchOptions = {},
    ): CommandResult<unknown> {
        if (!isObject(input)) {
            return fail(
                "invalid_payload",
                "must be an object { command, payload }",
                "",
            );
        }
        const { command, payload, transient } = input;
        if (typeof command !== "string") {
            return fail("invalid_payload", "must be a string", "/command");
        }
        if (!this.definition(command)) return this.unknown(command, "/command");
        if (!isObject(payload)) {
            return fail("invalid_payload", "must be an object", "/payload");
        }
        if (transient !== undefined && typeof transient !== "boolean") {
            return fail("invalid_payload", "must be a boolean", "/transient");
        }
        for (const key of Object.keys(input)) {
            if (key !== "command" && key !== "payload" && key !== "transient") {
                return fail("invalid_payload", "is not allowed", `/${key}`);
            }
        }
        return this.enqueueOrExecute(
            command,
            payload,
            {
                ...(transient === undefined ? {} : { transient }),
                ...(options.meta === undefined ? {} : { meta: options.meta }),
            },
            "/payload",
        );
    }

    private enqueueOrExecute(
        command: string,
        payload: unknown,
        options: RunOptions | undefined,
        prefix: string,
    ): CommandResult<unknown> {
        if (this.dryRuns > 0) {
            // issued from a middleware during `can` / `check`: nothing may commit, so it is a dry run
            return this.execute(command, payload, options ?? {}, true, prefix);
        }
        if (this.inFlight > 0) {
            // issued from a middleware: runs once the current command committed
            this.queue.push(() => {
                this.execute(command, payload, options ?? {}, false, prefix);
            });
            return fail(
                "queued",
                `"${command}" was issued while another command was running; it runs after it`,
            );
        }
        try {
            return this.execute(command, payload, options ?? {}, false, prefix);
        } finally {
            // a throwing listener or reducer must not strand the commands a middleware queued
            this.drain();
        }
    }

    private drain() {
        while (this.inFlight === 0 && this.queue.length > 0) {
            this.queue.shift()?.();
        }
    }

    private execute(
        command: string,
        payload: unknown,
        options: RunOptions,
        dryRun: boolean,
        prefix: string,
    ): CommandResult<unknown> {
        // a dry run commits nothing, not even the ids it generated
        const ids = dryRun ? this.ids.clone() : this.ids;
        const draft = new Draft(this.committed, ids, this.now);
        const execution: Execution = {
            draft,
            dryRun,
            options,
            steps: [],
            thrown: undefined,
        };
        if (dryRun) {
            this.dryRuns++;
        } else {
            this.inFlight++;
        }
        let ran: { result: CommandResult<unknown>; payload: unknown };
        try {
            ran = this.runChain(
                execution,
                command,
                payload,
                { payload: prefix, transient: "/transient" },
                false,
            );
            if (ran.result.ok && draft.state !== this.committed) {
                this.features.stateChanged(draft, this.committed);
            }
        } finally {
            if (dryRun) {
                this.dryRuns--;
            } else {
                this.inFlight--;
            }
        }
        if (execution.thrown) {
            throw execution.thrown.error;
        }
        const { result } = ran;
        if (!result.ok || dryRun) {
            return result;
        }
        const before = this.committed as unknown as CalendarState<T>;
        this.committed = draft.state;
        const event: CommandEvent<T> = {
            command,
            payload: ran.payload,
            result: result.value,
            before,
            after: this.committed as unknown as CalendarState<T>,
            transient: options.transient === true,
            meta: options.meta,
            ...(command === "batch" ? { commands: execution.steps } : {}),
        };
        this.emit(event);
        return result;
    }

    /**
     * The failure of a payload field that belongs to a feature not installed (`occurrenceId`): not
     * a field of the payload's schema in this model, so `invalid_payload`, naming the feature.
     */
    private featureField(payload: unknown): CommandResult<never> | undefined {
        if (!isObject(payload)) return undefined;
        for (const key of Object.keys(payload)) {
            const owner = this.features.missing("payloadFields", key);
            if (owner !== undefined) {
                return fail(
                    "invalid_payload",
                    `"${key}" ${requiresFeature(owner)}`,
                    `/${key}`,
                );
            }
        }
        return undefined;
    }

    /**
     * Looks up, validates and runs one command through the middleware chain on the execution's
     * draft. Returns its result, its errors placed at `at`, and the payload the reducer ran with (a
     * middleware may have rewritten it).
     */
    private runChain(
        execution: Execution,
        command: string,
        payload: unknown,
        at: ErrorPaths,
        inBatch: boolean,
    ): { result: CommandResult<unknown>; payload: unknown } {
        const { draft, dryRun, options } = execution;
        const definition = this.definition(command);
        if (!definition) return { result: this.unknown(command), payload };
        const missing = this.featureField(payload);
        if (missing) return { result: prefixed(missing, at.payload), payload };
        const failed = invalid(
            validate(definition.payloadSchema, payload, at.payload),
        );
        if (failed) {
            return { result: failed, payload };
        }
        if (options.transient === true && !definition.transient) {
            return {
                result: fail(
                    "invalid_payload",
                    `"${command}" cannot run as a transient step`,
                    at.transient,
                ),
                payload,
            };
        }

        const validated = payload;
        const get = (key: CommandContextGetKey, query?: { id?: unknown }) => {
            switch (key) {
                case "event-by":
                    return typeof query?.id === "string"
                        ? draft.event(query.id)
                        : undefined;
                case "calendar-by":
                    return typeof query?.id === "string"
                        ? draft.calendar(query.id)
                        : undefined;
                case "settings":
                    return draft.state.settings;
                case "view":
                    return draft.state.view;
                default:
                    return undefined;
            }
        };
        // the command was looked up by name and the payload validated against its schema
        const context = {
            command: command as CommandName,
            payload: payload as PayloadOf<T, CommandName>,
            dryRun,
            transient: options.transient === true,
            inBatch,
            meta: options.meta,
            state: this.committed as unknown as CalendarState<T>,
            get,
        } as unknown as CommandContext<T>;

        const reduceContext: ReduceContext = {
            draft,
            features: this.features,
            runInBatch: (subCommand, subPayload, path) => {
                const sub = this.runChain(
                    execution,
                    subCommand,
                    subPayload,
                    {
                        payload: `${path}/payload`,
                        transient: `${path}/command`,
                    },
                    true,
                );
                const { result } = sub;
                if (!result.ok) {
                    return result.error.code === "unknown_command"
                        ? fail(
                              "unknown_command",
                              result.error.message,
                              `${path}/command`,
                          )
                        : result;
                }
                execution.steps.push({
                    command: subCommand,
                    payload: sub.payload,
                    result: result.value,
                });
                return result;
            },
        };

        let ranWith = payload;
        const core = (): CommandResult<unknown> => {
            // a middleware may have replaced the payload, or changed it in place: either is
            // validated again (no middleware, nothing to check twice)
            if (context.payload !== validated || this.middleware.length > 0) {
                const rewritten =
                    this.featureField(context.payload) ??
                    invalid(
                        validate(definition.payloadSchema, context.payload),
                        "rewritten by a middleware: ",
                    );
                if (rewritten) return rewritten;
            }
            ranWith = context.payload;
            try {
                return definition.reduce(
                    context.payload as never,
                    reduceContext,
                );
            } catch (thrown) {
                execution.thrown ??= { error: thrown };
                return fail("refused", "the command failed");
            }
        };
        const result = prefixed(this.chain(context, core), at.payload);
        return { result, payload: ranWith };
    }

    private chain(
        context: CommandContext<T>,
        core: () => CommandResult<unknown>,
    ): CommandResult<unknown> {
        const list = [...this.middleware];
        const at = (i: number): CommandResult<unknown> => {
            const middleware = list[i];
            if (!middleware) {
                return core();
            }
            let called = false;
            let nextResult: CommandResult<unknown> = fail(
                "vetoed",
                "a middleware returned no result",
            );
            const next = () => {
                if (!called) {
                    called = true;
                    nextResult = at(i + 1);
                }
                return nextResult;
            };
            let out: CommandResult<unknown> | undefined;
            try {
                out = middleware(context, next);
            } catch (thrown) {
                return fail(
                    "middleware_error",
                    thrown instanceof Error ? thrown.message : String(thrown),
                );
            }
            if (out === undefined) {
                return nextResult;
            }
            return out;
        };
        return at(0);
    }

    private emit(event: CommandEvent<T>) {
        this.events.push(event);
        if (this.delivering) {
            return;
        }
        this.delivering = true;
        let failure: { error: unknown } | undefined;
        try {
            for (
                let next = this.events.shift();
                next !== undefined;
                next = this.events.shift()
            ) {
                for (const listener of [...this.listeners]) {
                    try {
                        listener(next);
                    } catch (thrown) {
                        failure ??= { error: thrown };
                    }
                }
            }
        } finally {
            this.delivering = false;
        }
        if (failure) {
            throw failure.error;
        }
    }
}

const EMPTY_CALENDAR: CalendarDocument = { version: 1, events: [] };

/**
 * Creates a calendar model from a document, version 1 (an empty calendar without one), with the
 * opt-in features of `options.features`. The document is validated; an invalid one (a field of a
 * feature that is not installed included) throws a {@link CalendarValidationError} listing every
 * problem with its JSON path. A missing feature requirement throws too.
 */
export function createCalendarModel<
    T extends CalendarTypes = AnyTypes,
    const F extends CalendarFeatures = readonly [],
>(
    json?: CalendarDocument<T>,
    options: CalendarModelOptions<F> = {},
): CalendarModel<T, F> {
    const features = composeFeatures(options.features);
    const ids = new IdSource(options.createId);
    const now = options.now ?? Date.now;
    const loaded = loadDocument(json ?? EMPTY_CALENDAR, { features, ids, now });
    if (!loaded.ok) {
        throw new CalendarValidationError(loaded.issues);
    }
    const model = new Model<T, F>(loaded.state, ids, now, features);
    registerFeatures(model, features);
    return model;
}
