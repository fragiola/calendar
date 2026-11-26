import type { EventFlags, RecurrenceJson } from "./calendar-document";
import type {
    AnyTypes,
    CalendarDataOf,
    CalendarTypes,
    EventDataOf,
    KindOf,
} from "./calendar-types";

/**
 * An event in the model's state (D3, D6): its document fields, frozen, its id always set. `start`
 * and `end` are kept as the document wrote them (a date when `allDay`, RFC 3339 otherwise), so a
 * round trip is stable.
 */
export interface CalendarEvent<K extends string = string, D = unknown>
    extends Readonly<EventFlags> {
    readonly id: string;
    readonly kind?: K;
    readonly title: string;
    readonly start: string;
    readonly end: string;
    readonly allDay: boolean;
    readonly timeZone?: string;
    readonly calendarId?: string;
    readonly recurrence?: Readonly<RecurrenceJson>;
    readonly sourceId?: string;
    readonly data?: D;
}

/** An event of the registry `T`: a union discriminated by `kind`, so `data` narrows. */
export type CalendarEventOf<T extends CalendarTypes = AnyTypes> = {
    [K in KindOf<T>]: CalendarEvent<K, EventDataOf<T, K>>;
}[KindOf<T>];

/** A calendar (a category of events) in the model's state. */
export interface CalendarInfo<D = unknown> {
    readonly id: string;
    readonly title: string;
    readonly editable?: boolean;
    readonly visible?: boolean;
    readonly data?: D;
}

/** A calendar of the registry `T`. */
export type CalendarInfoOf<T extends CalendarTypes = AnyTypes> = CalendarInfo<
    CalendarDataOf<T>
>;
