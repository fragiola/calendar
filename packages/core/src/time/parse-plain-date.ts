// The document's all-day dates are `YYYY-MM-DD` only (D4); a command also takes a `PlainDate`
// object (D5). Anything else is an issue at the field's path, never a guess.
import { invalid, type ValidationResult } from "../document/validation-issue";
import { isPlainDate } from "./is-plain-date";
import type { PlainDate } from "./plain-date";

const PLAIN_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A `YYYY-MM-DD` string or a `PlainDate` object as a plain date, or the issue at `path`. */
export function parsePlainDate(
    value: unknown,
    path = "",
): ValidationResult<PlainDate> {
    if (typeof value === "string") {
        const match = PLAIN_DATE.exec(value);
        const date = match && {
            year: Number(match[1]),
            month: Number(match[2]),
            day: Number(match[3]),
        };
        return date && isPlainDate(date)
            ? { ok: true, value: date }
            : invalid(path, `"${value}" is not a date as YYYY-MM-DD`);
    }
    if (isPlainDate(value)) {
        return {
            ok: true,
            value: { year: value.year, month: value.month, day: value.day },
        };
    }
    return invalid(
        path,
        "expected a date as YYYY-MM-DD or { year, month, day }",
    );
}
