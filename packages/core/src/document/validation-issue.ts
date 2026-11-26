// What every validation helper of the core returns: a value, or the issues found, each one at the
// JSON pointer (RFC 6901) of the field it is about. Validation never throws (AGENTS.md, D3).

/** A problem found in a value: where (a JSON pointer, RFC 6901; `""` is the value itself) and what. */
export interface ValidationIssue {
    readonly path: string;
    readonly message: string;
}

/** A validated value, or the issues that refused it. */
export type ValidationResult<T> =
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

/** A refusal with one issue. */
export function invalid<T>(path: string, message: string): ValidationResult<T> {
    return { ok: false, issues: [{ path, message }] };
}
