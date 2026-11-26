// The results of the features' `get` keys, typed in the core beside the core's own (types cost no
// bytes; the code is in each feature's entry): `model.get` is typed from the installed features.
import type { DateRangeJson } from "./queries";

/** A day's business hours (`get("business-hours-in")`, `constraints()`). */
export interface BusinessHoursRange {
    /** the day, `YYYY-MM-DD`, in the display zone */
    readonly date: string;
    /** RFC 3339, in the display zone */
    readonly start: string;
    /** RFC 3339, in the display zone (exclusive) */
    readonly end: string;
    /** where it starts in a time-grid column, as a fraction from `slotMinTime` (0–1, clipped) */
    readonly top: number;
    /** how long it is in a time-grid column, as a fraction (0 when outside the slots) */
    readonly height: number;
}

/** A range a source has not been fetched for (`get("ranges-to-fetch")`, `eventSources()`). */
export interface RangeToFetch {
    readonly sourceId: string;
    /** days, `end` exclusive */
    readonly range: DateRangeJson;
}

/** A source and what the model knows of it (`get("event-source-by")`, `eventSources()`). */
export interface EventSourceStatus {
    readonly id: string;
    readonly calendarId?: string;
    /** the ranges received, merged */
    readonly fetched: readonly DateRangeJson[];
    /** the ranges being fetched (`event-sources.set-loading`) */
    readonly loading: readonly DateRangeJson[];
}
