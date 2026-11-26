// The instants a zone shows a wall clock at: one usually, two in an overlap (clocks set back), none
// in a gap (clocks set forward). The candidate offsets are the zone's a day before and a day after
// the wall clock read as UTC: a day is wider than any offset (±14 h), so both sides of a
// transition near it are seen, including Apia's 24-hour jump.
import { offsetMilliseconds } from "./time-zone-offset";

const MS_PER_DAY = 86_400_000;

/** The candidates of a wall clock (`local`: its fields counted as if UTC). */
export interface WallClockCandidates {
    /** The instants showing the wall clock, earliest first: empty in a gap. */
    readonly instants: readonly number[];
    /** The offset before the nearby transition (the only one when there is none). */
    readonly before: number;
    /** The offset after it. */
    readonly after: number;
}

/** Every instant at which `timeZone` shows the wall clock `local`. */
export function wallClockCandidates(
    timeZone: string,
    local: number,
): WallClockCandidates {
    const before = offsetMilliseconds(timeZone, local - MS_PER_DAY);
    const after = offsetMilliseconds(timeZone, local + MS_PER_DAY);
    const instants = [...new Set([before, after])]
        .filter(
            (offset) => offsetMilliseconds(timeZone, local - offset) === offset,
        )
        .map((offset) => local - offset)
        .sort((a, b) => a - b);
    return { instants, before, after };
}
