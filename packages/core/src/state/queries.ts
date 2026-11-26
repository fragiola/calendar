// The typed registry of every `get` / `is` key of the model (Dockable's `state/queries.ts`,
// fragiola/dockable, same author and licence): a key names its result, `-by` when it takes an id
// (`event-by { id }`, `event-permissions-by { eventId }`), an `is` key is the question after "is"
// (`event-editable { eventId }`). Layouts and attributes are pure functions of the state and the
// clock's day (D11, D16), memoized here per model so an unchanged part keeps its identity.
import { dayAttributes } from "../attributes/day-attributes";
import {
    type EventAttributesPayload,
    eventAttributes,
    occurrenceOf,
} from "../attributes/event-attributes";
import { rootAttributes } from "../attributes/root-attributes";
import {
    type SlotAttributesPayload,
    slotAttributes,
} from "../attributes/slot-attributes";
import { COMMANDS } from "../commands/catalogue";
import type { CommandDefinition } from "../commands/define";
import { type EventPermissions, permissionsOf } from "../commands/edit-rules";
import type { CommandInfo, NoPayload } from "../commands/types";
import type { CalendarDocument } from "../document/calendar-document";
import type {
    CalendarEventOf,
    CalendarInfoOf,
} from "../document/calendar-event";
import type { CalendarSettings } from "../document/calendar-settings";
import type { AnyTypes, CalendarTypes } from "../document/calendar-types";
import { toCalendarJson } from "../document/to-calendar-json";
import type { OwnedBy } from "../features/keys";
import type { ComposedFeatures } from "../features/registry";
import type {
    CalendarFeatureInfo,
    FeatureState,
    PartAttributes,
} from "../features/types";
import { dayHeaderParts } from "../format/day-header-parts";
import { slotLabelParts } from "../format/slot-label-parts";
import { titleParts } from "../format/title-parts";
import { type DayGrid, type DayGridWeek, dayGrid } from "../layout/day-grid";
import { type LayoutInput, layoutInput } from "../layout/layout-input";
import { type ListDay, type ListLayout, listLayout } from "../layout/list";
import type { Occurrence } from "../layout/occurrence";
import { PartCache } from "../layout/reuse";
import {
    type TimeGrid,
    type TimeGridColumn,
    timeGrid,
} from "../layout/time-grid";
import type { FormatOptions } from "../locale/date-time-format";
import { fromEpochDay, toEpochDay } from "../time/epoch-day";
import { formatPlainDate } from "../time/format-plain-date";
import { parsePlainDate } from "../time/parse-plain-date";
import { todayOf } from "../view/today";
import { isValidDay } from "../view/valid-days";
import type { DayRange } from "../view/view-days";
import type { CalendarState, ViewState } from "./calendar-state";
import { indexOf } from "./draft";
import type {
    BusinessHoursRange,
    EventSourceStatus,
    RangeToFetch,
} from "./feature-queries";

/**
 * The payload argument of a query: optional when the payload has no required field
 * (`model.get("events")`), required otherwise (`model.get("event-by", { id })`).
 */
export type QueryArgs<P> = NoPayload extends P ? [payload?: P] : [payload: P];

/** A range of dates as JSON: `start` included, `end` excluded (D4). */
export interface DateRangeJson {
    readonly start: string;
    readonly end: string;
}

/** What `model.get(key, payload)` reads: each key's payload and result. */
export interface ModelGetMap<T extends CalendarTypes = AnyTypes> {
    /** an event by its id */
    "event-by": {
        payload: { id: string };
        result: CalendarEventOf<T> | undefined;
    };
    /** every event, in document order */
    events: { payload: NoPayload; result: readonly CalendarEventOf<T>[] };
    /** the events of a calendar, in document order */
    "calendar-events-by": {
        payload: { calendarId: string };
        result: readonly CalendarEventOf<T>[];
    };
    /** a calendar by its id */
    "calendar-by": {
        payload: { id: string };
        result: CalendarInfoOf<T> | undefined;
    };
    /** every calendar, in document order */
    calendars: { payload: NoPayload; result: readonly CalendarInfoOf<T>[] };
    /** the settings in effect */
    settings: { payload: NoPayload; result: CalendarSettings };
    /** an event's permissions in effect (D9: the event's, its calendar's, the settings') */
    "event-permissions-by": {
        payload: { eventId: string };
        result: EventPermissions | undefined;
    };
    /** the view: its type and anchor date (D7) */
    view: { payload: NoPayload; result: ViewState };
    /** today in the display zone, from the model's clock (D16) */
    today: { payload: NoPayload; result: string };
    /** the days the view shows (a month view's whole weeks), hidden edge days left out */
    "visible-range": { payload: NoPayload; result: DateRangeJson };
    /** the days the view is about (a month view's month) */
    "current-range": { payload: NoPayload; result: DateRangeJson };
    /** the occurrences the view shows, in event order (D6) */
    occurrences: { payload: NoPayload; result: readonly Occurrence[] };
    /**
     * an occurrence by its id: one the view shows, else one a feature finds (a recurring event's,
     * any date), else a non-recurring event's own
     */
    "occurrence-by": {
        payload: { id: string };
        result: Occurrence | undefined;
    };
    /**
     * the occurrences that touch a range of days (the display zone's), recurring ones expanded, in
     * event order (requires `recurrence()`)
     */
    "occurrences-in": {
        payload: { range: DateRangeJson };
        result: readonly Occurrence[];
    };
    /**
     * the day grid (D11): a month view's weeks, or a time-grid view's all-day row; `null` for a
     * list view. `maxLanes` is the engine's measured limit for `dayMaxEvents: "auto"`
     */
    "day-grid": { payload: { maxLanes?: number }; result: DayGrid | null };
    /** the time grid (D11) of a week, day or `days` view; `null` otherwise */
    "time-grid": { payload: NoPayload; result: TimeGrid | null };
    /** the view's days that hold occurrences, with them (D11) */
    list: { payload: NoPayload; result: ListLayout };
    /** a day's part attributes (D17): `data-date` and its `data-*` state */
    "day-attributes-by": {
        payload: { date: string };
        result: PartAttributes | undefined;
    };
    /** an occurrence's part attributes (D17): its ids and its `data-*` state */
    "event-attributes-by": {
        payload: EventAttributesPayload;
        result: PartAttributes | undefined;
    };
    /** a time-grid slot's part attributes (D17): `data-date`, `data-time` and the features' */
    "slot-attributes-by": {
        payload: SlotAttributesPayload;
        result: PartAttributes | undefined;
    };
    /**
     * the view's title as `Intl.DateTimeFormat#formatRangeToParts` parts in the settings' locale
     * (D4): a month view's month, another view's days; `format` replaces the default options
     */
    "title-parts": {
        payload: { format?: FormatOptions };
        result: readonly Intl.DateTimeRangeFormatPart[];
    };
    /**
     * a day's header as `Intl.DateTimeFormat` parts (D4): the weekday in a month view, the weekday
     * and the day in a time grid; `undefined` for no date
     */
    "day-header-by": {
        payload: { date: string; format?: FormatOptions };
        result: readonly Intl.DateTimeFormatPart[] | undefined;
    };
    /** a slot label (an `HH:mm` time) as `Intl.DateTimeFormat` parts (D4); `undefined` for no time */
    "slot-label-by": {
        payload: { time: string; format?: FormatOptions };
        result: readonly Intl.DateTimeFormatPart[] | undefined;
    };
    /**
     * the business hours of each day of a range (default the visible one) in the display zone, with
     * their place in a time-grid column (requires `constraints()`)
     */
    "business-hours-in": {
        payload: { range?: DateRangeJson };
        result: readonly BusinessHoursRange[];
    };
    /**
     * per source, the ranges of a range of days (default the visible one) neither received nor
     * being fetched, merged (requires `eventSources()`)
     */
    "ranges-to-fetch": {
        payload: { range?: DateRangeJson };
        result: readonly RangeToFetch[];
    };
    /** a source and its fetched and loading ranges (requires `eventSources()`) */
    "event-source-by": {
        payload: { id: string };
        result: EventSourceStatus | undefined;
    };
    /** the root's part attributes (D17) */
    "root-attributes": { payload: NoPayload; result: PartAttributes };
    /** the document, version 1 (a writable copy); the view only with `includeView` (D7) */
    "calendar-json": {
        payload: { includeView?: boolean };
        result: CalendarDocument<T>;
    };
    /** every command with its description and JSON Schemas (an assistant's tools) */
    commands: { payload: NoPayload; result: readonly CommandInfo[] };
    /** the installed features */
    features: { payload: NoPayload; result: readonly CalendarFeatureInfo[] };
}

/** A key of `model.get`. */
export type ModelGetKey = keyof ModelGetMap;

/** The payload of `model.get(K)`. */
export type ModelGetPayload<
    T extends CalendarTypes,
    K extends ModelGetKey,
> = ModelGetMap<T>[K]["payload"];

/** The result of `model.get(K)`. */
export type ModelGetResult<
    T extends CalendarTypes,
    K extends ModelGetKey,
> = ModelGetMap<T>[K]["result"];

/** What `model.is(key, payload)` asks: each question's payload. */
export interface ModelIsMap {
    /** the event can be changed (`event.update`) */
    "event-editable": { eventId: string };
    /** the event's start can move (`event.move`) */
    "event-start-editable": { eventId: string };
    /** the event's duration can change (`event.resize` of its end) */
    "event-duration-editable": { eventId: string };
    /** the event can be removed */
    "event-deletable": { eventId: string };
    /** the calendar's events show */
    "calendar-visible": { calendarId: string };
    /** the date is today, in the display zone */
    "date-today": { date: string };
    /** the date is outside `validRange` */
    "date-disabled": { date: string };
    /** the list layout has no day */
    "list-empty": NoPayload;
    /** the event has a recurrence rule (requires `recurrence()`) */
    "event-recurring": { eventId: string };
    /** the source has a range being fetched; without `sourceId`, any source (requires `eventSources()`) */
    "event-source-loading": { sourceId?: string };
}

/** A key of `model.is`. */
export type ModelIsKey = keyof ModelIsMap;

/** The payload of `model.is(K)`. */
export type ModelIsPayload<K extends ModelIsKey> = ModelIsMap[K];

/** A model's reads, memoized for its states. */
export interface Queries {
    get(state: CalendarState, key: string, payload: unknown): unknown;
    is(state: CalendarState, key: string, payload: unknown): boolean;
}

/** The command list of `get("commands")`: the core's, then the installed features'. */
function commandInfo(
    definitions: readonly CommandDefinition[],
): readonly CommandInfo[] {
    return Object.freeze(
        definitions.map((definition) =>
            Object.freeze({
                name: definition.name,
                description: definition.description,
                payloadSchema: definition.payloadSchema,
                resultSchema: definition.resultSchema,
                transient: definition.transient,
            }),
        ),
    );
}

function rangeJson(range: DayRange): DateRangeJson {
    return Object.freeze({
        start: formatPlainDate(fromEpochDay(range.start)),
        end: formatPlainDate(fromEpochDay(range.end)),
    });
}

function dayOf(date: unknown): number | undefined {
    const parsed = parsePlainDate(date);
    return parsed.ok ? toEpochDay(parsed.value) : undefined;
}

/** One memo: the last value for the last inputs. */
class Last<V> {
    private inputs: readonly unknown[] = [];
    private value: V | undefined;

    get(inputs: readonly unknown[], make: () => V): V {
        if (
            this.value !== undefined &&
            inputs.length === this.inputs.length &&
            inputs.every((input, i) => input === this.inputs[i])
        ) {
            return this.value;
        }
        this.inputs = inputs;
        this.value = make();
        return this.value;
    }
}

/** The reads of a model with these features and this clock. */
export function createQueries(
    features: ComposedFeatures,
    now: () => number,
): Queries {
    const commands = commandInfo([...COMMANDS, ...features.commands.values()]);
    const input = new Last<LayoutInput>();
    const dayGridMemo = new Last<DayGrid | null>();
    const timeGridMemo = new Last<TimeGrid | null>();
    const listMemo = new Last<ListLayout>();
    const weeks = new PartCache<DayGridWeek>();
    const columns = new PartCache<TimeGridColumn>();
    const listDays = new PartCache<ListDay>();

    const inputOf = (state: CalendarState): LayoutInput => {
        const today = todayOf(state.settings, now);
        return input.get([state, today], () =>
            layoutInput(state, features, today),
        );
    };
    const eventOf = (state: CalendarState, id: unknown) => {
        const at =
            typeof id === "string" ? indexOf(state.events).get(id) : undefined;
        return at === undefined ? undefined : state.events[at];
    };
    const calendarOf = (state: CalendarState, id: unknown) => {
        const at =
            typeof id === "string"
                ? indexOf(state.calendars).get(id)
                : undefined;
        return at === undefined ? undefined : state.calendars[at];
    };
    const permissions = (state: CalendarState, eventId: unknown) => {
        const event = eventOf(state, eventId);
        return event
            ? permissionsOf(
                  event,
                  event.calendarId === undefined
                      ? undefined
                      : calendarOf(state, event.calendarId),
                  state.settings,
              )
            : undefined;
    };

    // formatted parts, frozen and reused while the locale is the same (adapters ask per render)
    let formats = new Map<string, unknown>();
    let formatsLocale = "";
    const formatted = <V>(
        state: CalendarState,
        key: readonly unknown[],
        make: () => V,
    ): V => {
        if (state.settings.locale !== formatsLocale || formats.size > 2000) {
            formats = new Map();
            formatsLocale = state.settings.locale;
        }
        const id = JSON.stringify(key);
        if (formats.has(id)) return formats.get(id) as V;
        const made = make();
        const value = (
            Array.isArray(made)
                ? Object.freeze(made.map((part) => Object.freeze(part)))
                : made
        ) as V;
        formats.set(id, value);
        return value;
    };

    type Payload = Readonly<Record<string, unknown>>;
    const getters: Record<
        Exclude<ModelGetKey, OwnedBy<"get">>,
        (state: CalendarState, payload: Payload) => unknown
    > = {
        "event-by": (state, { id }) => eventOf(state, id),
        events: (state) => state.events,
        "calendar-events-by": (state, { calendarId }) =>
            state.events.filter((event) => event.calendarId === calendarId),
        "calendar-by": (state, { id }) => calendarOf(state, id),
        calendars: (state) => state.calendars,
        settings: (state) => state.settings,
        "event-permissions-by": (state, { eventId }) =>
            permissions(state, eventId),
        view: (state) => state.view,
        today: (state) =>
            formatPlainDate(fromEpochDay(todayOf(state.settings, now))),
        "visible-range": (state) => rangeJson(inputOf(state).days.visible),
        "current-range": (state) => rangeJson(inputOf(state).days.current),
        occurrences: (state) =>
            inputOf(state).placed.map((placed) => placed.occurrence),
        "occurrence-by": (state, { id }) =>
            typeof id === "string"
                ? occurrenceOf(inputOf(state), features, id)
                : undefined,
        "day-grid": (state, { maxLanes }) => {
            const layout = inputOf(state);
            return dayGridMemo.get([layout, maxLanes], () =>
                dayGrid(
                    layout,
                    weeks,
                    typeof maxLanes === "number" ? maxLanes : undefined,
                ),
            );
        },
        "time-grid": (state) => {
            const layout = inputOf(state);
            return timeGridMemo.get([layout], () => timeGrid(layout, columns));
        },
        list: (state) => {
            const layout = inputOf(state);
            return listMemo.get([layout], () => listLayout(layout, listDays));
        },
        "day-attributes-by": (state, { date }) =>
            dayAttributes(inputOf(state), features, date),
        "event-attributes-by": (state, payload) =>
            eventAttributes(
                inputOf(state),
                features,
                payload as unknown as EventAttributesPayload,
            ),
        "slot-attributes-by": (state, payload) =>
            slotAttributes(state, features, payload),
        "title-parts": (state, { format }) => {
            const { days } = inputOf(state);
            const { type, duration } = state.view;
            return formatted(
                state,
                ["title", type, duration, days.current, days.visible, format],
                () =>
                    titleParts(
                        state,
                        days,
                        format as FormatOptions | undefined,
                    ),
            );
        },
        "day-header-by": (state, { date, format }) =>
            formatted(state, ["day", state.view.type, date, format], () =>
                dayHeaderParts(
                    state,
                    date,
                    format as FormatOptions | undefined,
                ),
            ),
        "slot-label-by": (state, { time, format }) =>
            formatted(state, ["slot", time, format], () =>
                slotLabelParts(
                    state,
                    time,
                    format as FormatOptions | undefined,
                ),
            ),
        "root-attributes": (state) => rootAttributes(state, features),
        "calendar-json": (state, { includeView }) =>
            toCalendarJson(state, features, includeView === true),
        commands: () => commands,
        features: () => features.info,
    };
    const questions: Record<
        Exclude<ModelIsKey, OwnedBy<"is">>,
        (state: CalendarState, payload: Payload) => boolean
    > = {
        "event-editable": (state, { eventId }) =>
            permissions(state, eventId)?.editable === true,
        "event-start-editable": (state, { eventId }) =>
            permissions(state, eventId)?.startEditable === true,
        "event-duration-editable": (state, { eventId }) =>
            permissions(state, eventId)?.durationEditable === true,
        "event-deletable": (state, { eventId }) =>
            permissions(state, eventId)?.deletable === true,
        "calendar-visible": (state, { calendarId }) => {
            const calendar = calendarOf(state, calendarId);
            return calendar !== undefined && calendar.visible !== false;
        },
        "date-today": (state, { date }) => {
            const day = dayOf(date);
            return day !== undefined && day === todayOf(state.settings, now);
        },
        "date-disabled": (state, { date }) => {
            const day = dayOf(date);
            return day !== undefined && !isValidDay(day, inputOf(state).valid);
        },
        "list-empty": (state) => {
            const layout = inputOf(state);
            return (
                listMemo.get([layout], () => listLayout(layout, listDays)).days
                    .length === 0
            );
        },
    };

    return {
        get(state, key, payload) {
            const read = Object.hasOwn(getters, key)
                ? getters[key as keyof typeof getters]
                : undefined;
            if (read) return read(state, (payload ?? {}) as Payload);
            return features.getters.get(key)?.(
                state as FeatureState,
                payload ?? {},
            );
        },
        is(state, key, payload) {
            const ask = Object.hasOwn(questions, key)
                ? questions[key as keyof typeof questions]
                : undefined;
            if (ask) return ask(state, (payload ?? {}) as Payload);
            return (
                features.questions.get(key)?.(
                    state as FeatureState,
                    payload ?? {},
                ) ?? false
            );
        },
    };
}
