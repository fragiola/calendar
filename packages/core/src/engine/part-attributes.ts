// The attributes of each part (D17, D12): `data-calendar-part`, the model's `data-*`, the roles of
// the event-calendar grid pattern, the one tab stop and `data-focused`, and the features' gesture
// state. The engine gives them with its focus and its features' parts (`engine.adapter.attributes`);
// `partAttributes` gives them before an engine exists (a server render and the first client
// render), with the tab stop the model alone decides, so the two renders match.
//
// The roles (the time-grid structure settled with the React adapter, AGENTS.md "Issue #7, roles"):
// - a month: `grid` > `row` (a week, with a `rowheader` week number) > `gridcell` (a day) >
//   `list` (its events) > `listitem` (a segment);
// - a time grid: `grid` > `row` of `columnheader`s, the all-day `row` of `gridcell` days (each with
//   its `list` of segments), then one `row` per slot (`rowheader` label, a `gridcell` per day);
//   each day's timed events are a `list` of `listitem`s in a positioned column layer, which has no
//   role of its own;
// - a list view: a `list` per day, its events `listitem`s that are each a tab stop.
import type { CalendarTypes } from "../document/calendar-types";
import type {
    FeatureEngine,
    MutablePartAttributes,
} from "../features/engine-types";
import type { CalendarFeatures, PartAttributes } from "../features/types";
import type { CalendarModel } from "../model/calendar-model";
import { clockOf } from "../model/model-clock";
import { todayOf } from "../view/today";
import type { PartName, PartPayloadMap } from "./adapter";
import type { FocusPosition } from "./grid-point";
import {
    defaultTabStop,
    keyOfPosition,
    occurrenceOf,
    positionOfPart,
} from "./positions";

/** The engine's focus, as the attributes read it. */
export interface FocusView {
    /** the position holding the grid's one tab stop (read only for the focusable parts) */
    readonly tabStop: () => FocusPosition | null;
    /** the focused position (`data-focused`) */
    readonly focused: FocusPosition | null;
}

/** The part an occurrence's element is named, by where it shows. */
function eventPart(
    model: CalendarModel,
    occurrenceId: string,
): "segment" | "time-event" | "list-event" {
    const view = model.state.view.type;
    if (view === "list") return "list-event";
    if (view === "month") return "segment";
    return occurrenceOf(model, occurrenceId)?.allDay === false
        ? "time-event"
        : "segment";
}

function focusAttributes(
    model: CalendarModel,
    part: PartName,
    payload: Readonly<Record<string, unknown>>,
    focus: FocusView,
    into: MutablePartAttributes,
): void {
    const position = positionOfPart(model, part, payload);
    const key = position === null ? undefined : keyOfPosition(position);
    const stop = focus.tabStop();
    into.tabindex = stop !== null && key === keyOfPosition(stop) ? "0" : "-1";
    into["data-focused"] =
        focus.focused !== null && key === keyOfPosition(focus.focused)
            ? ""
            : undefined;
}

/** A part's attributes with a focus and the features' engine parts (the engine's). */
export function attributesOf(
    model: CalendarModel,
    part: PartName,
    payload: Readonly<Record<string, unknown>>,
    focus: FocusView,
    features: readonly FeatureEngine[],
): PartAttributes {
    const into: MutablePartAttributes = { "data-calendar-part": part };
    const date = typeof payload.date === "string" ? payload.date : undefined;
    const dayAttributes = () =>
        date === undefined ? {} : model.get("day-attributes-by", { date });
    switch (part) {
        case "root":
            Object.assign(into, model.get("root-attributes"));
            break;
        case "day-grid":
        case "time-grid":
            into.role = "grid";
            break;
        case "week":
        case "all-day-row":
        case "column-headers":
            into.role = "row";
            break;
        case "slot-row":
            into.role = "row";
            into["data-time"] = String(payload.time);
            break;
        case "day":
        case "slot":
            Object.assign(
                into,
                part === "day"
                    ? model.get("day-attributes-by", { date: date ?? "" })
                    : model.get("slot-attributes-by", {
                          date: date ?? "",
                          time: String(payload.time),
                      }),
            );
            into.role = "gridcell";
            focusAttributes(model, part, payload, focus, into);
            break;
        case "week-number":
            into.role = "rowheader";
            break;
        case "slot-label":
            into.role = "rowheader";
            into["data-time"] = String(payload.time);
            break;
        case "column-header":
            into.role = "columnheader";
            Object.assign(into, dayAttributes());
            break;
        case "column":
            Object.assign(into, dayAttributes());
            break;
        case "day-events":
        case "column-events":
        case "list-day":
            into.role = "list";
            if (date) into["data-date"] = date;
            break;
        case "event": {
            const occurrenceId = String(payload.occurrenceId);
            Object.assign(
                into,
                model.get("event-attributes-by", {
                    occurrenceId,
                    continuesBefore: payload.continuesBefore === true,
                    continuesAfter: payload.continuesAfter === true,
                }),
            );
            into["data-calendar-part"] = eventPart(model, occurrenceId);
            into.role = "listitem";
            if (model.state.view.type === "list") into.tabindex = "0";
            else focusAttributes(model, part, payload, focus, into);
            break;
        }
        case "resize-handle":
            into["data-occurrence-id"] = String(payload.occurrenceId);
            into["data-edge"] = String(payload.edge);
            into["aria-hidden"] = "true";
            break;
        case "more":
            if (date) into["data-date"] = date;
            break;
        case "business-hours":
            if (date) into["data-date"] = date;
            into["aria-hidden"] = "true";
            break;
        case "now-indicator":
        case "drag-preview":
        case "selection":
            into["aria-hidden"] = "true";
            break;
        case "previous":
        case "next":
        case "today": {
            const command =
                part === "today"
                    ? "view.today"
                    : part === "next"
                      ? "view.next"
                      : "view.previous";
            if (!model.can(command, {})) into["data-disabled"] = "";
            break;
        }
        case "view-button": {
            const type = (payload as PartPayloadMap["view-button"]).type;
            const days = (payload as PartPayloadMap["view-button"]).days;
            const view = model.state.view;
            const pressed =
                view.type === type &&
                (days === undefined || view.days === days);
            into["aria-pressed"] = pressed ? "true" : "false";
            if (pressed) into["data-pressed"] = "";
            if (
                !model.can(
                    "view.set",
                    days === undefined ? { type } : { type, days },
                )
            ) {
                into["data-disabled"] = "";
            }
            break;
        }
        default:
            break;
    }
    for (const feature of features) {
        feature.attributes?.(part, payload, into);
    }
    return into;
}

/**
 * A part's attributes before an engine exists (a server render, the first client render): the
 * same as `engine.adapter.attributes` gives while nothing is focused and no gesture is under way,
 * the tab stop where the model puts it.
 */
export function partAttributes<
    T extends CalendarTypes,
    F extends CalendarFeatures,
    P extends PartName,
>(
    model: CalendarModel<T, F>,
    part: P,
    payload: PartPayloadMap[P],
): PartAttributes {
    const loose = model as unknown as CalendarModel;
    const today = todayOf(loose.state.settings, clockOf(loose));
    return attributesOf(
        loose,
        part,
        payload as Readonly<Record<string, unknown>>,
        { tabStop: () => defaultTabStop(loose, today), focused: null },
        [],
    );
}
