// Layout identity (D11): a part of a layout (a week row, a time-grid column, a list day) that did
// not change is the very object the last layout gave, so an adapter re-renders only what changed.
// A part is compared with the last one of its key by value, its nested lists element by element.
import { deepFreeze } from "../state/deep-freeze";

/** Whether two layout values are equal: primitives, plain objects and arrays of them. */
export function sameValue(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (
        typeof a !== "object" ||
        typeof b !== "object" ||
        a === null ||
        b === null
    ) {
        return false;
    }
    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!sameValue(a[i], b[i])) return false;
        }
        return true;
    }
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    const keys = Object.keys(left);
    if (keys.length !== Object.keys(right).length) return false;
    for (const key of keys) {
        if (!sameValue(left[key], right[key])) return false;
    }
    return true;
}

/** A part kept, and the events it was laid out from. */
interface Kept<P> {
    readonly part: P;
    readonly sources: readonly object[];
}

/**
 * Keeps the parts of one layout by key, to hand back the last object of a part that is unchanged:
 * equal by value, and laid out from the very same events (a part names events by id only, so an
 * event whose title or data changed makes its parts new: an adapter re-renders them).
 */
export class PartCache<P> {
    private last = new Map<string, Kept<P>>();
    private next = new Map<string, Kept<P>>();

    /** `part`, or the last layout's equal part of the same key from the same `sources`; frozen. */
    keep(key: string, part: P, sources: readonly object[]): P {
        const previous = this.last.get(key);
        const same =
            previous !== undefined &&
            previous.sources.length === sources.length &&
            previous.sources.every((source, i) => source === sources[i]) &&
            sameValue(previous.part, part);
        const kept = same ? previous : { part: deepFreeze(part), sources };
        this.next.set(key, kept);
        return kept.part;
    }

    /** Ends a layout: its parts are the ones the next compares with. */
    done(): void {
        this.last = this.next;
        this.next = new Map();
    }
}
