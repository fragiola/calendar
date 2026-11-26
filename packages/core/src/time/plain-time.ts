/** A wall-clock time of day with minute precision: `hour` 0–23, or 24:00 for the end of a day. */
export interface PlainTime {
    readonly hour: number;
    readonly minute: number;
}

/** A time of day as the document writes it: `HH:mm` (`09:30`; `24:00` is the end of the day). */
export type PlainTimeString = string;
