// Whether the engine knows a zone is asked by every check of an event in its own zone (a drag asks
// at each target), and answering builds an `Intl.DateTimeFormat`: each name's answer is kept.
import { invalid, type ValidationResult } from "../document/validation-issue";
import { LOCAL_TIME_ZONE } from "./resolve-time-zone";

const known = new Map<string, boolean>();
/** Names kept before the cache starts over. */
const MAX_NAMES = 1000;

function isKnown(name: string): boolean {
    let answer = known.get(name);
    if (answer === undefined) {
        try {
            new Intl.DateTimeFormat("en-US", { timeZone: name });
            answer = true;
        } catch {
            answer = false;
        }
        if (known.size >= MAX_NAMES) known.clear();
        known.set(name, answer);
    }
    return answer;
}

/** A zone the engine knows (an IANA name, `UTC`, or `"local"`), or the issue at `path`. */
export function validateTimeZone(
    value: unknown,
    path = "",
): ValidationResult<string> {
    if (typeof value !== "string") {
        return invalid(path, 'expected a time zone name (IANA, or "local")');
    }
    if (value === LOCAL_TIME_ZONE || isKnown(value)) {
        return { ok: true, value };
    }
    return invalid(path, `"${value}" is not a known time zone`);
}
