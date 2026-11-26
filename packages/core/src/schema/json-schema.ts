// From Tree (fragiola/tree, packages/core/src/schema/types.ts), same author and licence; the
// calendar adds the bounds and the pattern its dates, times and settings need.

/** A JSON value. */
export type JsonValue =
    | string
    | number
    | boolean
    | null
    | readonly JsonValue[]
    | { readonly [key: string]: JsonValue };

/** The JSON Schema types the validator knows. */
export type JsonSchemaType =
    | "object"
    | "array"
    | "string"
    | "number"
    | "integer"
    | "boolean"
    | "null";

/**
 * The subset of JSON Schema (2020-12) that the calendar's schemas use and its validator checks.
 * Other keywords may be present; they are ignored.
 */
export interface JsonSchema {
    readonly $id?: string;
    readonly $ref?: string;
    readonly $defs?: { readonly [name: string]: JsonSchema };
    readonly title?: string;
    readonly description?: string;
    readonly type?: JsonSchemaType;
    readonly properties?: { readonly [name: string]: JsonSchema };
    readonly required?: readonly string[];
    /** `false` forbids other keys; a schema validates every other key's value (a map) */
    readonly additionalProperties?: boolean | JsonSchema;
    readonly enum?: readonly JsonValue[];
    readonly const?: JsonValue;
    readonly items?: JsonSchema;
    readonly oneOf?: readonly JsonSchema[];
    readonly anyOf?: readonly JsonSchema[];
    readonly minimum?: number;
    readonly maximum?: number;
    readonly exclusiveMinimum?: number;
    readonly minLength?: number;
    /** an ECMAScript regular expression the whole string must match (anchor it) */
    readonly pattern?: string;
    readonly minItems?: number;
    readonly maxItems?: number;
    readonly uniqueItems?: boolean;
}
