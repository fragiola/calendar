// `get("ranges-to-fetch", { range })`: per source, in the settings' order, the days of a range
// (default the visible one) neither received nor being fetched, merged: the app fetches exactly
// those, then `event-sources.receive`s each.
import type { FeatureState } from "../../features/types";
import type { RangeToFetch } from "../../state/feature-queries";
import { viewDays } from "../../view/view-days";
import { sourceStateOf, sourcesOf } from "../state/source-state";
import { daysOf, daysOfAll, rangeJson, withoutRange } from "./day-ranges";

const memo = new WeakMap<FeatureState, Map<string, readonly RangeToFetch[]>>();

/** What to fetch for a range of days (`undefined`: the visible range); none for a bad range. */
export function rangesToFetch(
    state: FeatureState,
    range: { readonly start?: unknown; readonly end?: unknown } | undefined,
): readonly RangeToFetch[] {
    const days =
        range === undefined
            ? viewDays(state.view, state.settings).visible
            : daysOf(range);
    if (!days) return Object.freeze([]);
    const key = `${days.start} ${days.end}`;
    let cached = memo.get(state);
    const hit = cached?.get(key);
    if (hit) return hit;
    const list: RangeToFetch[] = [];
    for (const source of sourcesOf(state)) {
        const known = sourceStateOf(state, source.id);
        let gaps = [days];
        for (const done of [
            ...daysOfAll(known.fetched),
            ...daysOfAll(known.loading),
        ]) {
            gaps = withoutRange(gaps, done);
        }
        for (const gap of gaps) {
            list.push(
                Object.freeze({ sourceId: source.id, range: rangeJson(gap) }),
            );
        }
    }
    const frozen = Object.freeze(list);
    if (!cached) {
        cached = new Map();
        memo.set(state, cached);
    }
    cached.set(key, frozen);
    return frozen;
}
