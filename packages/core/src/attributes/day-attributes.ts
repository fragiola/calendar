// A day's part attributes (D17), from the state alone (a server render and the first render have
// them): its position as `data-date`, its state as `data-*` present (`""`) or absent
// (`undefined`), and what the installed features add. Every adapter spreads the same record.
import type { ComposedFeatures } from "../features/registry";
import type { FeatureState, PartAttributes } from "../features/types";
import type { LayoutInput } from "../layout/layout-input";
import { toEpochDay } from "../time/epoch-day";
import { formatPlainDate } from "../time/format-plain-date";
import { parsePlainDate } from "../time/parse-plain-date";
import { isValidDay } from "../view/valid-days";
import { weekdayOf } from "../view/view-days";

/** `""` when a boolean state is on, `undefined` (absent) when off. */
export function flag(on: boolean): "" | undefined {
    return on ? "" : undefined;
}

/** The attributes of a day (`YYYY-MM-DD` or a plain date), or `undefined` for no date. */
export function dayAttributes(
    input: LayoutInput,
    features: ComposedFeatures,
    date: unknown,
): PartAttributes | undefined {
    const parsed = parsePlainDate(date);
    if (!parsed.ok) return undefined;
    const day = toEpochDay(parsed.value);
    const text = formatPlainDate(parsed.value);
    const { current } = input.days;
    const own: PartAttributes = {
        "data-date": text,
        "data-today": flag(day === input.today),
        "data-outside": flag(
            input.state.view.type === "month" &&
                (day < current.start || day >= current.end),
        ),
        "data-weekend": flag(input.weekend.includes(weekdayOf(day))),
        "data-past": flag(day < input.today),
        "data-disabled": flag(!isValidDay(day, input.valid)),
    };
    const added = features.dayAttributes(input.state as FeatureState, text);
    return added ? { ...own, ...added } : own;
}
