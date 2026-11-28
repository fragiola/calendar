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
//   the positioned layer of columns over the slot rows is the grid's last `row` (`columns`), a
//   `gridcell` per day (`column`) holding its timed events, a `list` of `listitem`s (Issue #8: a
//   list must sit in a cell, never beside the rows);
// - a list view: a `list` per day, its events `listitem`s that are each a tab stop.
//
// The grid states (Epic #13's carry-over): `aria-current="date"` on today's cell (and a time grid's
// header of today), `aria-selected` on every date cell while `selection()` is installed (its grid
// `aria-multiselectable`), `aria-disabled` on the cells outside `validRange`. A month's column
// headers stand for weekdays: they keep `data-date` (a date of that weekday) and `data-weekend`,
// never the first row's day state. A time grid's columns are numbered (`aria-colcount` on the
// grid, `aria-colindex` on each cell: the time axis is column 1, the days from 2), so the header
// row, the all-day row and the columns' layer, which have no axis cell of their own, keep the slot
// rows' column count without an empty header the library could not name (D19). A month numbers its
// columns only when its rows render a week number (`weekNumberColumn`, the adapters' root option:
// only the app knows it renders `WeekNumber`, and a server render must know it too): the week
// number is column 1, the days from 2, so the header row of seven and the rows of eight agree.
import type { CalendarTypes } from "../document/calendar-types";
import type {
    FeatureEngine,
    MutablePartAttributes,
} from "../features/engine-types";
import { featuresOf } from "../features/registry";
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

/** How the app renders the parts, beyond their payloads (the same for every part of a root). */
export interface PartAttributeOptions {
    /**
     * a month's rows render a week number (`WeekNumber`) before their days: the grid counts that
     * column (`aria-colcount`), the week number is column 1 and the days and their headers from 2
     */
    readonly weekNumberColumn?: boolean | undefined;
}

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

/** Whether a model has `selection()` installed (its date cells are selectable). */
function selectable(model: CalendarModel): boolean {
    return featuresOf(model).list.some(
        (feature) => feature.name === "selection",
    );
}

/** A time grid's column of a date (the axis is 1, the days from 2), `undefined` outside one. */
function columnIndex(
    model: CalendarModel,
    date: string | undefined,
): string | undefined {
    if (date === undefined) return undefined;
    const grid = model.get("time-grid");
    if (!grid) return undefined;
    const index = grid.columns.findIndex((column) => column.date === date);
    return index < 0 ? undefined : String(index + 2);
}

/** Whether a month's columns are numbered: its rows render a week number first. */
function numberedMonth(
    model: CalendarModel,
    options: PartAttributeOptions,
): boolean {
    return (
        options.weekNumberColumn === true &&
        model.state.view.type === "month" &&
        model.get("day-grid") !== null
    );
}

/** A numbered month's column of a date (the week number is 1, the days from 2). */
function monthColumnIndex(
    model: CalendarModel,
    date: string | undefined,
): string | undefined {
    if (date === undefined) return undefined;
    for (const week of model.get("day-grid")?.weeks ?? []) {
        const index = week.days.findIndex((day) => day.date === date);
        if (index >= 0) return String(index + 2);
    }
    return undefined;
}

/** The ARIA a date cell's day state says (`day`, `slot`): `aria-current`, `aria-disabled`. */
function cellStates(
    model: CalendarModel,
    part: PartName,
    date: string | undefined,
    head: MutablePartAttributes,
    into: MutablePartAttributes,
): void {
    if (part === "day") {
        if (head["data-today"] === "") into["aria-current"] = "date";
        if (head["data-disabled"] === "") into["aria-disabled"] = "true";
    } else if (date !== undefined) {
        // a slot holds no day state of its own: its day's says whether it is outside the range
        const day = model.get("day-attributes-by", { date });
        if (day?.["data-disabled"] === "") into["aria-disabled"] = "true";
    }
}

/**
 * A part's attributes from the model alone, in layers: `head` (the part, the model's `data-*`, the
 * role), then the focus's (`tabindex`, `data-focused`, on a `focusable` part) and the features'
 * state (`data-selected`, `data-dragging`) come, then a date cell's ARIA (`states`,
 * `aria-selected` when `selectable`, `aria-colindex`).
 */
export interface BaseAttributes {
    readonly head: PartAttributes;
    /** a date cell's `aria-current` and `aria-disabled` */
    readonly states: PartAttributes;
    /** `aria-colindex` */
    readonly column: string | undefined;
    /** the part holds the grid's roving tab stop (a day, a slot, an event outside a list) */
    readonly focusable: boolean;
    /** a date cell with `selection()` installed: `aria-selected` from `data-selected` */
    readonly selectable: boolean;
}

/** What {@link baseAttributes} gives a part that is no date cell. */
const NO_STATES: PartAttributes = Object.freeze({});

/** A part's attributes from the model alone (no focus, no features' engine state). */
export function baseAttributes(
    model: CalendarModel,
    part: PartName,
    payload: Readonly<Record<string, unknown>>,
    options: PartAttributeOptions = {},
): BaseAttributes {
    const into: MutablePartAttributes = { "data-calendar-part": part };
    const date = typeof payload.date === "string" ? payload.date : undefined;
    const dayAttributes = () =>
        date === undefined ? {} : model.get("day-attributes-by", { date });
    let focusable = false;
    switch (part) {
        case "root":
            Object.assign(into, model.get("root-attributes"));
            break;
        case "day-grid":
        case "time-grid": {
            into.role = "grid";
            if (selectable(model)) into["aria-multiselectable"] = "true";
            const grid = part === "time-grid" ? model.get("time-grid") : null;
            if (grid) into["aria-colcount"] = String(grid.columns.length + 1);
            if (part === "day-grid" && numberedMonth(model, options)) {
                const days = model.get("day-grid")?.weeks[0]?.days.length ?? 0;
                into["aria-colcount"] = String(days + 1);
            }
            break;
        }
        case "week":
        case "all-day-row":
        case "column-headers":
        case "columns":
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
            focusable = true;
            break;
        case "week-number":
            into.role = "rowheader";
            if (numberedMonth(model, options)) into["aria-colindex"] = "1";
            break;
        case "slot-label":
            into.role = "rowheader";
            into["data-time"] = String(payload.time);
            if (model.get("time-grid")) into["aria-colindex"] = "1";
            break;
        case "column-header": {
            into.role = "columnheader";
            const day = dayAttributes() ?? {};
            if (model.state.view.type === "month") {
                // a weekday's header: not the first row's day (outside, past, today, ...)
                if (day["data-date"] !== undefined)
                    into["data-date"] = day["data-date"];
                if (day["data-weekend"] !== undefined)
                    into["data-weekend"] = day["data-weekend"];
                if (numberedMonth(model, options)) {
                    const column = monthColumnIndex(model, date);
                    if (column !== undefined) into["aria-colindex"] = column;
                }
                break;
            }
            Object.assign(into, day);
            if (into["data-today"] === "") into["aria-current"] = "date";
            const column = columnIndex(model, date);
            if (column !== undefined) into["aria-colindex"] = column;
            break;
        }
        case "column": {
            Object.assign(into, dayAttributes());
            into.role = "gridcell";
            const column = columnIndex(model, date);
            if (column !== undefined) into["aria-colindex"] = column;
            break;
        }
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
            else focusable = true;
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
    if (part !== "day" && part !== "slot") {
        return {
            head: into,
            states: NO_STATES,
            column: undefined,
            focusable,
            selectable: false,
        };
    }
    const states: MutablePartAttributes = {};
    cellStates(model, part, date, into, states);
    return {
        head: into,
        states,
        column:
            part === "day" && numberedMonth(model, options)
                ? monthColumnIndex(model, date)
                : columnIndex(model, date),
        focusable,
        selectable: selectable(model),
    };
}

/** The focus's attributes of a focusable part: `tabindex` and `data-focused`. */
export function focusAttributesOf(
    model: CalendarModel,
    part: PartName,
    payload: Readonly<Record<string, unknown>>,
    focus: FocusView,
): PartAttributes {
    const into: MutablePartAttributes = {};
    focusAttributes(model, part, payload, focus, into);
    return into;
}

/**
 * A part's attributes from its layers: the model's, the focus's (`undefined`: not focusable) and
 * the features' engine state, written in the order the features expect.
 */
export function composeAttributes(
    base: BaseAttributes,
    focus: PartAttributes | undefined,
    part: PartName,
    payload: Readonly<Record<string, unknown>>,
    features: readonly FeatureEngine[],
): PartAttributes {
    const into: MutablePartAttributes = { ...base.head };
    if (focus) Object.assign(into, focus);
    for (const feature of features) {
        feature.attributes?.(part, payload, into);
    }
    if (part === "day" || part === "slot") {
        Object.assign(into, base.states);
        if (base.selectable) {
            into["aria-selected"] =
                into["data-selected"] === "" ? "true" : "false";
        }
        if (base.column !== undefined) into["aria-colindex"] = base.column;
    }
    return into;
}

/** A part's attributes with a focus and the features' engine parts (the engine's). */
export function attributesOf(
    model: CalendarModel,
    part: PartName,
    payload: Readonly<Record<string, unknown>>,
    focus: FocusView,
    features: readonly FeatureEngine[],
    options: PartAttributeOptions = {},
): PartAttributes {
    const base = baseAttributes(model, part, payload, options);
    return composeAttributes(
        base,
        base.focusable
            ? focusAttributesOf(model, part, payload, focus)
            : undefined,
        part,
        payload,
        features,
    );
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
    options?: PartAttributeOptions,
): PartAttributes {
    const loose = model as unknown as CalendarModel;
    const today = todayOf(loose.state.settings, clockOf(loose));
    return attributesOf(
        loose,
        part,
        payload as Readonly<Record<string, unknown>>,
        { tabStop: () => defaultTabStop(loose, today), focused: null },
        [],
        options,
    );
}
