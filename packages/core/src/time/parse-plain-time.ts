import { invalid, type ValidationResult } from "../document/validation-issue";
import type { PlainTime } from "./plain-time";

const PLAIN_TIME = /^(\d{2}):(\d{2})$/;

/**
 * An `HH:mm` string or a `PlainTime` object as a time of day, or the issue at `path`. `24:00` (the
 * end of a day, for a range's exclusive end such as `slotMaxTime`) is accepted.
 */
export function parsePlainTime(
    value: unknown,
    path = "",
): ValidationResult<PlainTime> {
    let hour: unknown;
    let minute: unknown;
    if (typeof value === "string") {
        const match = PLAIN_TIME.exec(value);
        if (!match) {
            return invalid(path, `"${value}" is not a time as HH:mm`);
        }
        hour = Number(match[1]);
        minute = Number(match[2]);
    } else if (typeof value === "object" && value !== null) {
        ({ hour, minute } = value as Record<string, unknown>);
    } else {
        return invalid(path, "expected a time as HH:mm or { hour, minute }");
    }
    if (
        !Number.isInteger(hour) ||
        !Number.isInteger(minute) ||
        (hour as number) < 0 ||
        (minute as number) < 0 ||
        (minute as number) > 59 ||
        (hour as number) > 24 ||
        (hour === 24 && minute !== 0)
    ) {
        return invalid(path, "a time is 00:00–23:59, or 24:00");
    }
    return {
        ok: true,
        value: { hour: hour as number, minute: minute as number },
    };
}
