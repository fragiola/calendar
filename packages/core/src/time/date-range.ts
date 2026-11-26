import type { PlainDate } from "./plain-date";

/** Days from `start` up to `end`, **exclusive** (D4): `{ 2026-11-26, 2026-11-27 }` is one day. */
export interface DateRange {
    readonly start: PlainDate;
    readonly end: PlainDate;
}
