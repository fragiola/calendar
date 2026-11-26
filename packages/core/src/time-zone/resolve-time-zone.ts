/** The display zone setting that means the host's zone. */
export const LOCAL_TIME_ZONE = "local";

/** A zone setting as an IANA name: `"local"` is the host's zone, read when called. */
export function resolveTimeZone(timeZone: string): string {
    return timeZone === LOCAL_TIME_ZONE
        ? new Intl.DateTimeFormat().resolvedOptions().timeZone
        : timeZone;
}
