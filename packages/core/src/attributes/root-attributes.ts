import type { ComposedFeatures } from "../features/registry";
import type { FeatureState, PartAttributes } from "../features/types";
import type { CalendarState } from "../state/calendar-state";

/** The root's part attributes (D17): the view type as `data-view`, and the features'. */
export function rootAttributes(
    state: CalendarState,
    features: ComposedFeatures,
): PartAttributes {
    const own: PartAttributes = { "data-view": state.view.type };
    const added = features.rootAttributes(state as FeatureState);
    return added ? { ...own, ...added } : own;
}
