import type { Instant } from "./instant";

/** The instant `minutes` minutes after `at`: an exact delta, whatever the wall clock does (D4). */
export function addMinutes(at: Instant, minutes: number): Instant {
    return (at + Math.round(minutes * 60_000)) as Instant;
}
