/** A deep copy of a JSON value: the state never holds an object the caller still owns. */
export function cloneJson<V>(value: V): V {
    return value === undefined
        ? value
        : (JSON.parse(JSON.stringify(value)) as V);
}
