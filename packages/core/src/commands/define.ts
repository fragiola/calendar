// From Tree (fragiola/tree, packages/core/src/commands/define.ts), same author and licence.
import type { AnyTypes } from "../document/calendar-types";
import type { ValidationIssue } from "../document/validation-issue";
import type { ComposedFeatures } from "../features/registry";
import type { JsonSchema } from "../schema/json-schema";
import type { Draft } from "../state/draft";
import type {
    CommandError,
    CommandErrorCode,
    CommandName,
    CommandResult,
    PayloadOf,
    ResultOf,
} from "./types";

/** What a reducer can use besides the draft. */
export interface ReduceContext {
    readonly draft: Draft;
    /** the model's features, composed */
    readonly features: ComposedFeatures;
    /** runs one command of a batch on the same draft, through the middleware chain */
    runInBatch(
        command: string,
        payload: unknown,
        path: string,
    ): CommandResult<unknown>;
}

/** A command: its description, schemas and reducer (the core's, or a feature's). */
export interface CommandDefinition<C extends CommandName = CommandName> {
    readonly name: C;
    /** written for an assistant choosing a tool (`model.get("commands")`) */
    readonly description: string;
    readonly payloadSchema: JsonSchema;
    readonly resultSchema: JsonSchema;
    /** whether it may run as a transient step of a continuous gesture */
    readonly transient: boolean;
    /** applies the command to the draft, or returns why it cannot */
    readonly reduce: (
        payload: PayloadOf<AnyTypes, C>,
        context: ReduceContext,
    ) => CommandResult<ResultOf<AnyTypes, C>>;
}

export function ok<R>(value: R): { readonly ok: true; readonly value: R } {
    return { ok: true, value };
}

/** Why a command did not apply. */
export type Failure = { readonly ok: false; readonly error: CommandError };

export function fail(
    code: CommandErrorCode,
    message: string,
    path?: string,
    issues?: readonly ValidationIssue[],
): Failure {
    const error: { -readonly [K in keyof CommandError]: CommandError[K] } = {
        code,
        message,
    };
    if (path !== undefined) {
        error.path = path;
    }
    if (issues !== undefined) {
        error.issues = issues;
    }
    return { ok: false, error };
}

/** The `invalid_payload` failure of issues (the first one's message and path), if any. */
export function invalid(
    issues: readonly ValidationIssue[],
    prefix = "",
): Failure | undefined {
    const [first] = issues;
    return (
        first &&
        fail("invalid_payload", `${prefix}${first.message}`, first.path, issues)
    );
}

/**
 * Declares a command: its payload is typed by its name (`CommandMap`: a feature's commands are
 * there too, types cost no bytes), and its schemas keep their literal types (the type tests read
 * them with `FromSchema`).
 */
export function defineCommand<
    C extends CommandName,
    const P extends JsonSchema,
    const R extends JsonSchema,
>(
    definition: CommandDefinition<C> & {
        readonly payloadSchema: P;
        readonly resultSchema: R;
    },
): Omit<CommandDefinition<C>, "payloadSchema" | "resultSchema"> & {
    readonly payloadSchema: P;
    readonly resultSchema: R;
} {
    return definition;
}
