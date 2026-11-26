// The public entry of `@fragiola/calendar`: the framework-free core. Every opt-in feature has an
// entry of its own (`@fragiola/calendar/<feature>`) that this one never imports.

// layout (D11) and part attributes (D17)
export type { EventAttributesPayload } from "./attributes/event-attributes";
export type { SlotAttributesPayload } from "./attributes/slot-attributes";
export type { EventPermissions } from "./commands/edit-rules";
export {
    type BatchEntry,
    type BatchStep,
    type CalendarUpdatePayload,
    type CommandContext,
    type CommandContextBase,
    type CommandContextGetMap,
    type CommandError,
    type CommandErrorCode,
    type CommandEvent,
    type CommandInfo,
    type CommandListener,
    type CommandMap,
    type CommandName,
    type CommandResult,
    type DateInput,
    type DaysPayload,
    type EditScope,
    type EventAddPayload,
    type EventMovePayload,
    type EventResizePayload,
    type EventSetDataPayload,
    type EventSetFlagsPayload,
    type EventTimesResult,
    type EventUpdatePayload,
    type Middleware,
    type MoveDelta,
    type NoPayload,
    type OccurrenceTarget,
    type PayloadOf,
    type ResultOf,
    type RunOptions,
    type SettingsPatch,
    type ViewResult,
    veto,
} from "./commands/types";
// the document (D3)
export type {
    BusinessHours,
    CalendarDocument,
    CalendarEventInit,
    CalendarEventJson,
    CalendarInfoJson,
    CalendarSettingsJson,
    ConstraintRange,
    EventConstraint,
    EventFlags,
    EventSource,
    RecurrenceJson,
    ValidRangeJson,
    ViewJson,
    ViewType,
} from "./document/calendar-document";
export type {
    CalendarEvent,
    CalendarEventOf,
    CalendarInfo,
    CalendarInfoOf,
} from "./document/calendar-event";
export { calendarSchema } from "./document/calendar-schema";
export {
    type CalendarSettings,
    DEFAULT_SETTINGS,
} from "./document/calendar-settings";
export type {
    AnyTypes,
    CalendarDataOf,
    CalendarTypes,
    DataField,
    EventDataOf,
    KindOf,
} from "./document/calendar-types";
export { CalendarValidationError } from "./document/calendar-validation-error";
export type { CreateId } from "./document/id-source";
export {
    type ValidateCalendarOptions,
    validateCalendar,
} from "./document/validate-calendar";
export type {
    ValidationIssue,
    ValidationResult,
} from "./document/validation-issue";
// the engine: one view on screen (D11–D14, D16)
export type {
    CalendarEngineAdapter,
    PartName,
    PartPayloadMap,
    ViewChange,
} from "./engine/adapter";
export {
    type CalendarEngine,
    type CalendarEngineOptions,
    createCalendarEngine,
} from "./engine/calendar-engine";
export type {
    EngineHost,
    ResizeObserverConstructor,
} from "./engine/engine-host";
export type {
    Announcement,
    CalendarEngineEvent,
    CalendarEngineEventType,
} from "./engine/events";
export type {
    CellPosition,
    EventPosition,
    FocusPosition,
    GridPoint,
} from "./engine/grid-point";
export type { KeyTarget } from "./engine/keyboard";
export { partAttributes } from "./engine/part-attributes";
export type {
    DragPreview,
    PreviewSegments,
    PreviewTimes,
} from "./engine/preview";
export type {
    EngineGetKey,
    EngineGetMap,
    EngineIsKey,
    EngineIsMap,
    EngineRunKey,
    EngineRunMap,
    ExternalEventDraft,
    FocusTarget,
    NowPosition,
} from "./engine/verbs";
// the feature registry (`architecture/features.md`): for feature authors
export { defineFeature } from "./features/define-feature";
export type {
    FeatureEngine,
    FeatureEngineHost,
    FeatureGesture,
    FeatureModel,
    MutablePartAttributes,
    PressTarget,
} from "./features/engine-types";
export { FEATURE_KEYS, type FeatureName } from "./features/keys";
export type {
    AnyCalendarFeature,
    AnyFeatures,
    CalendarFeature,
    CalendarFeatureInfo,
    CalendarFeatures,
    CalendarStateOf,
    EditRequest,
    EditWrite,
    EngineGetKeyOf,
    EngineIsKeyOf,
    EngineRunKeyOf,
    EventChange,
    FeatureCommand,
    FeatureDocument,
    FeatureReads,
    FeatureState,
    PartAttributes,
    SelectionRange,
} from "./features/types";
export type {
    DayCell,
    DayGrid,
    DayGridWeek,
    Segment,
} from "./layout/day-grid";
export type { ListDay, ListItem, ListLayout } from "./layout/list";
export type { Occurrence, OccurrenceWindow } from "./layout/occurrence";
export type {
    TimeGrid,
    TimeGridColumn,
    TimeSegment,
    TimeSlot,
} from "./layout/time-grid";
// locale: weeks, week numbers, `Intl` parts
export type { FormatOptions } from "./locale/date-time-format";
export { formatDateParts } from "./locale/format-date-parts";
export { formatDateRangeParts } from "./locale/format-date-range-parts";
export { formatInstantParts } from "./locale/format-instant-parts";
export { formatTimeParts } from "./locale/format-time-parts";
export { isWeekend } from "./locale/is-weekend";
export { isoWeekOfYear } from "./locale/iso-week-of-year";
export { validateLocale } from "./locale/validate-locale";
export { ISO_WEEK, type WeekInfo, weekInfo } from "./locale/week-info";
export {
    type WeekOfYear,
    type WeekRules,
    weekOfYear,
} from "./locale/week-of-year";
// the model and its bus (D8, D20)
export {
    type CalendarModel,
    type CalendarModelOptions,
    createCalendarModel,
    type DispatchOptions,
} from "./model/calendar-model";
export type { JsonSchema, JsonValue } from "./schema/json-schema";
export type { CalendarState, ViewState } from "./state/calendar-state";
export type { Draft, DraftState } from "./state/draft";
export type {
    BusinessHoursRange,
    EventSourceStatus,
    RangeToFetch,
} from "./state/feature-queries";
export type {
    DateRangeJson,
    ModelGetKey,
    ModelGetMap,
    ModelGetPayload,
    ModelGetResult,
    ModelIsKey,
    ModelIsMap,
    ModelIsPayload,
    QueryArgs,
} from "./state/queries";
// time: plain dates and times, instants, RFC 3339
export { addDays } from "./time/add-days";
export { addMinutes } from "./time/add-minutes";
export { addMonths } from "./time/add-months";
export { comparePlainDates } from "./time/compare-plain-dates";
export type { DateRange } from "./time/date-range";
export { dateRangesOverlap } from "./time/date-ranges-overlap";
export { dayOfWeek, type Weekday } from "./time/day-of-week";
export { daysBetween } from "./time/days-between";
export { daysInMonth } from "./time/days-in-month";
export { formatDateTime } from "./time/format-date-time";
export { formatPlainDate } from "./time/format-plain-date";
export { formatPlainTime } from "./time/format-plain-time";
export { type Instant, instant } from "./time/instant";
export { isDateInRange } from "./time/is-date-in-range";
export { isPlainDate } from "./time/is-plain-date";
export { lastDateOfRange } from "./time/last-date-of-range";
export { minutesBetween } from "./time/minutes-between";
export { minutesOfDay } from "./time/minutes-of-day";
export type {
    DateTimeString,
    OffsetDateTime,
} from "./time/offset-date-time";
export { parseDateTime } from "./time/parse-date-time";
export { parsePlainDate } from "./time/parse-plain-date";
export { parsePlainTime } from "./time/parse-plain-time";
export type { PlainDate, PlainDateString } from "./time/plain-date";
export type { PlainTime, PlainTimeString } from "./time/plain-time";
export { timedDayRange } from "./time/timed-day-range";
export type { ZonedDateTimeFields } from "./time/zoned-date-time-fields";
// time zones: offsets, wall clock ↔ instant, DST
export { addDaysInZone } from "./time-zone/add-days-in-zone";
export { formatInstant } from "./time-zone/format-instant";
export { instantToWallClock } from "./time-zone/instant-to-wall-clock";
export { minutesInDay } from "./time-zone/minutes-in-day";
export { plainDateInZone } from "./time-zone/plain-date-in-zone";
export {
    LOCAL_TIME_ZONE,
    resolveTimeZone,
} from "./time-zone/resolve-time-zone";
export { startOfDay } from "./time-zone/start-of-day";
export { timeZoneOffset } from "./time-zone/time-zone-offset";
export { validateTimeZone } from "./time-zone/validate-time-zone";
export { wallClockToInstant } from "./time-zone/wall-clock-to-instant";
