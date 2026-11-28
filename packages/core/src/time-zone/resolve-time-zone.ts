// The host's zone is read once and kept: reading it builds an `Intl.DateTimeFormat`, far slower
// than the reads that ask for it (every layout, check and attribute of a drag). The engine reads it
// again at its midnight refresh (`refreshHostTimeZone`), so a host whose zone changes (a laptop
// that travelled) shows the new zone from the next day on, or at once when an engine is created.

/** The display zone setting that means the host's zone. */
export const LOCAL_TIME_ZONE = "local";

let hostTimeZone: string | undefined;

function readHostTimeZone(): string {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Reads the host's zone again (the engine's refresh: midnight, an engine created); whether it
 * changed since the last read.
 */
export function refreshHostTimeZone(): boolean {
    const before = hostTimeZone;
    hostTimeZone = readHostTimeZone();
    return before !== undefined && before !== hostTimeZone;
}

/**
 * A zone setting as an IANA name: `"local"` is the host's zone, read once and again at each
 * engine's midnight refresh.
 */
export function resolveTimeZone(timeZone: string): string {
    if (timeZone !== LOCAL_TIME_ZONE) return timeZone;
    hostTimeZone ??= readHostTimeZone();
    return hostTimeZone;
}
