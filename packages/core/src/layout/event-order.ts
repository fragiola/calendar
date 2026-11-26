// The `eventOrder` setting (FullCalendar's documented format, read fresh): comma-separated fields,
// each ascending or, with a leading `-`, descending. `start`, `end`, `duration`, `allDay`,
// `title`, `id`, `calendarId` and `kind` are the occurrence's; any other name reads the event's
// `data` field of that name. Strings compare by code point (the same order on every host),
// booleans false first, a missing value last.
import type { CalendarEvent } from "../document/calendar-event";

/** One field of an order. */
export interface OrderField {
    readonly field: string;
    readonly descending: boolean;
}

/** What an order compares: an occurrence's sort keys (wall-clock milliseconds) and its event. */
export interface Ordered {
    readonly start: number;
    readonly end: number;
    readonly allDay: boolean;
    readonly event: CalendarEvent;
}

const FIELD = /^(-?)([A-Za-z_$][\w$]*)$/;

const parsed = new Map<string, readonly OrderField[] | string>();

/** The fields of an `eventOrder`, or the problem with it. */
export function parseEventOrder(spec: string): readonly OrderField[] | string {
    const cached = parsed.get(spec);
    if (cached !== undefined) return cached;
    const fields: OrderField[] = [];
    let problem: string | undefined;
    for (const token of spec.split(",")) {
        const match = FIELD.exec(token.trim());
        if (!match?.[2]) {
            problem = `"${token.trim()}" is not a field name (a name, or -name for descending)`;
            break;
        }
        fields.push({ field: match[2], descending: match[1] === "-" });
    }
    const result = problem ?? Object.freeze(fields);
    parsed.set(spec, result);
    return result;
}

function fieldValue(item: Ordered, field: string): unknown {
    switch (field) {
        case "start":
            return item.start;
        case "end":
            return item.end;
        case "duration":
            return item.end - item.start;
        case "allDay":
            return item.allDay;
        case "title":
            return item.event.title;
        case "id":
            return item.event.id;
        case "calendarId":
            return item.event.calendarId;
        case "kind":
            return item.event.kind;
        default: {
            const data = item.event.data;
            return typeof data === "object" && data !== null
                ? (data as Record<string, unknown>)[field]
                : undefined;
        }
    }
}

function compareValues(a: unknown, b: unknown): number {
    if (a === b) return 0;
    if (a === undefined || a === null) return 1;
    if (b === undefined || b === null) return -1;
    if (typeof a === "number" && typeof b === "number") return a - b;
    if (typeof a === "boolean" && typeof b === "boolean") return a ? 1 : -1;
    const left = String(a);
    const right = String(b);
    return left < right ? -1 : left > right ? 1 : 0;
}

/** A comparator of the fields, ties left to the caller (a stable sort keeps document order). */
export function compareBy(
    fields: readonly OrderField[],
): (a: Ordered, b: Ordered) => number {
    return (a, b) => {
        for (const { field, descending } of fields) {
            const delta = compareValues(
                fieldValue(a, field),
                fieldValue(b, field),
            );
            if (delta !== 0) {
                // a missing value stays last either way
                const missing =
                    fieldValue(a, field) == null ||
                    fieldValue(b, field) == null;
                return descending && !missing ? -delta : delta;
            }
        }
        return 0;
    };
}
