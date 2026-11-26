import type { Instant } from "./instant";

/** A timed value as the document writes it: RFC 3339 with its offset (`2026-11-26T09:30:00-03:00`). */
export type DateTimeString = string;

/** A parsed RFC 3339 date-time: the instant, and the offset it was written with. */
export interface OffsetDateTime {
    readonly instant: Instant;
    /** Minutes east of UTC (`-03:00` is -180; `Z` is 0). */
    readonly offset: number;
}
