// A time-grid slot's part attributes (D17), from the state alone: its position as `data-date` and
// `data-time` (`HH:mm`), and what the installed features add (`data-business-hours`).
import type { ComposedFeatures } from "../features/registry";
import type { FeatureState, PartAttributes } from "../features/types";
import type { CalendarState } from "../state/calendar-state";
import { formatPlainDate } from "../time/format-plain-date";
import { formatPlainTime } from "../time/format-plain-time";
import { parsePlainDate } from "../time/parse-plain-date";
import { parsePlainTime } from "../time/parse-plain-time";

/** What `get("slot-attributes-by")` takes: the slot's day and its wall-clock start. */
export interface SlotAttributesPayload {
    /** `YYYY-MM-DD` */
    date: string;
    /** `HH:mm` */
    time: string;
}

/** The attributes of a slot, or `undefined` for no date or time. */
export function slotAttributes(
    state: CalendarState,
    features: ComposedFeatures,
    payload: Partial<SlotAttributesPayload>,
): PartAttributes | undefined {
    const date = parsePlainDate(payload.date);
    const time = parsePlainTime(payload.time);
    if (!date.ok || !time.ok) return undefined;
    const own: PartAttributes = {
        "data-date": formatPlainDate(date.value),
        "data-time": formatPlainTime(time.value),
    };
    const added = features.slotAttributes(
        state as FeatureState,
        own["data-date"] as string,
        own["data-time"] as string,
    );
    return added ? { ...own, ...added } : own;
}
