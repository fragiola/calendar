// From Tree (fragiola/tree, packages/core/src/commands/tree.ts, its `batch`), same author and
// licence.
import { defineCommand, fail, ok } from "./define";

export const batch = defineCommand({
    name: "batch",
    description:
        "Run several commands as one step: they apply in order, each seeing the result of the ones before it, and either all of them apply (one event, one undo step) or none does (the first failure is returned, at its path in `commands`).",
    payloadSchema: {
        type: "object",
        properties: {
            commands: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        command: {
                            type: "string",
                            description: "the command's name",
                        },
                        payload: {
                            type: "object",
                            description: "its payload",
                        },
                    },
                    required: ["command", "payload"],
                    additionalProperties: false,
                },
                description: "the commands, in order",
            },
        },
        required: ["commands"],
        additionalProperties: false,
    },
    resultSchema: {
        type: "object",
        properties: {
            results: {
                type: "array",
                items: { description: "a command's value" },
                description: "each command's value, in order",
            },
        },
        required: ["results"],
        additionalProperties: false,
    },
    transient: true,
    reduce: (payload, context) => {
        const results: unknown[] = [];
        for (const [i, entry] of payload.commands.entries()) {
            if (entry.command === "batch") {
                return fail(
                    "refused",
                    "a batch cannot hold a batch",
                    `/commands/${i}/command`,
                );
            }
            const result = context.runInBatch(
                entry.command,
                entry.payload,
                `/commands/${i}`,
            );
            if (!result.ok) return result;
            results.push(result.value);
        }
        return ok({ results });
    },
});
