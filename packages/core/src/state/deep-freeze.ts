/** Freezes a JSON value and everything in it (an already frozen object is not walked again). */
export function deepFreeze<V>(value: V): V {
    if (
        typeof value === "object" &&
        value !== null &&
        !Object.isFrozen(value)
    ) {
        for (const child of Object.values(value)) deepFreeze(child);
        Object.freeze(value);
    }
    return value;
}
