/**
 * A calendar date with no time and no zone, `month` 1–12. Structurally identical to
 * `@fragiola/primitives`' `PlainDate` (D5), so a date picked there passes here unchanged.
 */
export interface PlainDate {
    readonly year: number;
    readonly month: number;
    readonly day: number;
}

/** A plain date as the document writes it: `YYYY-MM-DD` (`2026-11-26`). */
export type PlainDateString = string;
