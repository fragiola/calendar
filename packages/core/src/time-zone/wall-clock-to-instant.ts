// Wall clock → instant with Temporal's `"compatible"` disambiguation (D4): a repeated wall clock
// (an overlap) takes the earlier instant, the offset before the transition; a skipped one (a gap)
// is read with the offset before the gap, which lands as far past the gap as it was into it
// (New York's 02:30 on 2026-03-08 is 03:30 EDT).
import type { Instant } from "../time/instant";
import { wallClockToEpoch } from "../time/wall-clock-epoch";
import type { ZonedDateTimeFields } from "../time/zoned-date-time-fields";
import { wallClockCandidates } from "./wall-clock-candidates";

/** The instant a zone shows a wall clock at (`"compatible"`); fields overflow (hour 24 → next day). */
export function wallClockToInstant(
    fields: ZonedDateTimeFields,
    timeZone: string,
): Instant {
    const local = wallClockToEpoch(fields);
    const { instants, before } = wallClockCandidates(timeZone, local);
    return (instants[0] ?? local - before) as Instant;
}
