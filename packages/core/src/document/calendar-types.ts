/**
 * What an app declares about its calendar's data: each event kind's data type, keyed by the kind,
 * and the data type of a calendar (a category). `event.data` narrows on `event.kind`.
 *
 * ```ts
 * type Types = { events: { meeting: { room: string }; reminder: undefined }; calendar: { color: string } };
 * const model = createCalendarModel<Types>(json);
 * ```
 */
export interface CalendarTypes {
    /** each event kind's data type, keyed by the kind */
    readonly events: object;
    /** the data of a calendar (a category of events) */
    readonly calendar: unknown;
}

/** The registry used when an app declares none: any kind, `unknown` data. */
export interface AnyTypes {
    readonly events: Record<string, unknown>;
    readonly calendar: unknown;
}

/** The event kinds of a registry. */
export type KindOf<T extends CalendarTypes> = Extract<
    keyof T["events"],
    string
>;

/** The data type of the event kind `K` of a registry. */
export type EventDataOf<
    T extends CalendarTypes,
    K extends string,
> = K extends keyof T["events"] ? T["events"][K] : never;

/** The data type of a calendar of a registry. */
export type CalendarDataOf<T extends CalendarTypes> = T["calendar"];

/** `data` is optional exactly when the data type allows `undefined`. */
export type DataField<D> = undefined extends D ? { data?: D } : { data: D };
