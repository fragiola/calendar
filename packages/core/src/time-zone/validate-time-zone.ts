import { invalid, type ValidationResult } from "../document/validation-issue";
import { LOCAL_TIME_ZONE } from "./resolve-time-zone";

/** A zone the engine knows (an IANA name, `UTC`, or `"local"`), or the issue at `path`. */
export function validateTimeZone(
    value: unknown,
    path = "",
): ValidationResult<string> {
    if (typeof value !== "string") {
        return invalid(path, 'expected a time zone name (IANA, or "local")');
    }
    if (value === LOCAL_TIME_ZONE) {
        return { ok: true, value };
    }
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return { ok: true, value };
    } catch {
        return invalid(path, `"${value}" is not a known time zone`);
    }
}
