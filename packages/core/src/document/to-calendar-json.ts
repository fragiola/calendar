// The document of a state (`get("calendar-json")`, D3): a writable copy with every core setting
// written (the defaults included), so loading it gives the same state and a round trip is stable.
// The view is model state, not document: written only with `includeView` (D7).
import type { ComposedFeatures } from "../features/registry";
import type { FeatureState } from "../features/types";
import type { CalendarState } from "../state/calendar-state";
import { cloneJson } from "../state/clone-json";
import type {
    CalendarDocument,
    CalendarEventJson,
    CalendarInfoJson,
    CalendarSettingsJson,
} from "./calendar-document";
import type { AnyTypes, CalendarTypes } from "./calendar-types";
import { calendarToJson, eventToJson } from "./entities";

/** The document of a state. */
export function toCalendarJson<T extends CalendarTypes = AnyTypes>(
    state: CalendarState<T>,
    features: ComposedFeatures,
    includeView = false,
): CalendarDocument<T> {
    const json: CalendarDocument<T> = {
        version: 1,
        events: state.events.map(eventToJson) as CalendarEventJson<T>[],
        calendars: state.calendars.map(calendarToJson) as CalendarInfoJson<T>[],
        settings: cloneJson(state.settings) as CalendarSettingsJson,
        ...features.toJson(state as unknown as FeatureState),
    };
    if (includeView) json.view = cloneJson(state.view);
    return json;
}
